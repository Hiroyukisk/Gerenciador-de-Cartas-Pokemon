const express = require('express');
const app = express();
const PORT = 3000;
const db = require('./db'); // importa conexão com o banco
const bcrypt = require('bcrypt'); // importa bcrypt pra hashear senhas
const path = require('path');
const cors = require('cors'); // importa cors pra permitir requisições de outras origens

// Configura CORS pra permitir apenas acessos locais
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type']
}));

// Serve arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Habilita parsing de JSON no body das requisições
app.use(express.json());

// =====================
// CADASTRO DE USUÁRIO
// =====================
app.post('/api/cadastro', async (req, res) => {
  const { nome, sobrenome, data_nascimento, email, email_confirmacao, senha, senha_confirmacao } = req.body;

  // Validação básica dos campos
  if (!nome || !sobrenome || !data_nascimento || !email || !email_confirmacao || !senha || !senha_confirmacao) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  if (email !== email_confirmacao) {
    return res.status(400).json({ message: 'Emails não conferem.' });
  }
  if (senha !== senha_confirmacao) {
    return res.status(400).json({ message: 'Senhas não conferem.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10); // gera hash da senha
    const query = `INSERT INTO usuarios (nome, sobrenome, data_nascimento, email, senha) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [nome, sobrenome, data_nascimento, email, hashedPassword], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(400).json({ message: 'Erro ao cadastrar. Talvez o email já exista.' });
      }
      return res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// =====================
// LOGIN
// =====================
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }
  const query = 'SELECT * FROM usuarios WHERE email = ?';
  db.get(query, [email], async (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Erro interno.' });
    }
    if (!row) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
    const senhaCorreta = await bcrypt.compare(senha, row.senha); // compara senha digitada com hash no banco
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }
    return res.status(200).json({ message: 'Login bem-sucedido!', usuarioId: row.id });
  });
});

// =====================
// BUSCAR DADOS DO USUÁRIO
// =====================
app.get('/api/usuario/:id', (req, res) => {
  const usuarioId = req.params.id;
  const query = 'SELECT email FROM usuarios WHERE id = ?';
  db.get(query, [usuarioId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
    if (!row) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    return res.status(200).json({ email: row.email });
  });
});

// =====================
// ALTERAR SENHA
// =====================
app.put('/api/alterar-senha', async (req, res) => {
  const { usuario_id, senha_atual, nova_senha, nova_senha_confirmacao } = req.body;

  if (!usuario_id || !senha_atual || !nova_senha || !nova_senha_confirmacao) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  if (nova_senha !== nova_senha_confirmacao) {
    return res.status(400).json({ message: 'A nova senha e a confirmação não conferem.' });
  }
  if (nova_senha.length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  const query = 'SELECT senha FROM usuarios WHERE id = ?';
  db.get(query, [usuario_id], async (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Erro interno.' });
    }
    if (!row) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const senhaCorreta = await bcrypt.compare(senha_atual, row.senha); // compara senha atual
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Senha atual incorreta.' });
    }

    try {
      const hashNovaSenha = await bcrypt.hash(nova_senha, 10); // gera hash da nova senha
      const updateQuery = 'UPDATE usuarios SET senha = ? WHERE id = ?';
      db.run(updateQuery, [hashNovaSenha, usuario_id], function (updateErr) {
        if (updateErr) {
          console.error(updateErr.message);
          return res.status(500).json({ message: 'Erro ao atualizar a senha.' });
        }
        return res.status(200).json({ message: 'Senha alterada com sucesso!' });
      });
    } catch (hashErr) {
      console.error(hashErr);
      return res.status(500).json({ message: 'Erro interno.' });
    }
  });
});

// =====================
// ADICIONAR CARTA
// =====================
app.post('/api/cartas', (req, res) => {
  const { usuario_id, nome, numero, setId, ano, quantidade, raridade, idioma, info, url_imagem, wishlist } = req.body;

  const wishlistInt = wishlist === true || wishlist === 1 ? 1 : 0; // transforma bool pra inteiro 0 ou 1

  if (!usuario_id || !nome || !numero || !setId) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios: nome, número e set.' });
  }
  if (!wishlistInt && (!quantidade || Number(quantidade) < 1)) {
    return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero para cartas normais.' });
  }

  const query = `
    INSERT INTO cartas (usuario_id, nome, numero, "set", ano, quantidade, raridade, idioma, info, url_imagem, wishlist)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [usuario_id, nome, numero, setId, ano, quantidade || 0, raridade || '', idioma || '', info || '', url_imagem || '', wishlistInt], function (err) {
    if (err) {
      console.error('Erro ao salvar carta:', err.message);
      return res.status(500).json({ success: false, message: 'Erro ao salvar carta.' });
    }
    return res.status(201).json({ success: true, id: this.lastID });
  });
});

// =====================
// BUSCAR CARTA ESPECÍFICA
// =====================
app.get('/api/carta/:id', (req, res) => {
  const cartaId = req.params.id;
  const query = 'SELECT * FROM cartas WHERE id = ?';
  db.get(query, [cartaId], (err, row) => {
    if (err) {
      console.error('Erro ao buscar carta:', err.message);
      return res.status(500).json({ message: 'Erro ao buscar carta.' });
    }
    if (!row) {
      return res.status(404).json({ message: 'Carta não encontrada.' });
    }
    return res.status(200).json(row);
  });
});

// =====================
// EDITAR CARTA
// =====================
app.put('/api/cartas/:cartaId', (req, res) => {
  const cartaId = req.params.cartaId;
  const { usuario_id, nome, numero, setId, ano, quantidade, raridade, idioma, info, url_imagem } = req.body;

  if (!usuario_id || !nome || !numero || !setId || !quantidade) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios estão faltando!' });
  }

  const query = `
    UPDATE cartas
    SET nome = ?, numero = ?, "set" = ?, ano = ?, quantidade = ?, raridade = ?, idioma = ?, info = ?, url_imagem = ?
    WHERE id = ? AND usuario_id = ?
  `;
  db.run(query, [nome, numero, setId, ano, quantidade, raridade, idioma, info, url_imagem, cartaId, usuario_id], function (err) {
    if (err) {
      console.error('Erro ao atualizar carta:', err.message);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar carta.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Carta não encontrada ou não pertence ao usuário.' });
    }
    return res.status(200).json({ success: true, message: 'Carta atualizada com sucesso!' });
  });
});

// =====================
// EXCLUIR CARTA
// =====================
app.delete('/api/cartas/:cartaId', (req, res) => {
  const cartaId = req.params.cartaId;
  const { usuario_id } = req.body;

  if (!usuario_id) return res.status(400).json({ message: 'usuario_id é obrigatório.' });

  const query = 'DELETE FROM cartas WHERE id = ? AND usuario_id = ?';
  db.run(query, [cartaId, usuario_id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Erro ao excluir carta.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Carta não encontrada ou não pertence ao usuário.' });
    }
    return res.status(200).json({ message: 'Carta excluída com sucesso!' });
  });
});

// =====================
// ATUALIZAR FAVORITA
// =====================
app.patch('/api/cartas/:cartaId/favorita', (req, res) => {
  const cartaId = req.params.cartaId;
  const { usuario_id, favorita } = req.body;

  if (typeof favorita !== 'boolean' && favorita !== 0 && favorita !== 1) {
    return res.status(400).json({ message: 'Campo favorita deve ser booleano.' });
  }
  if (!usuario_id) {
    return res.status(400).json({ message: 'usuario_id é obrigatório.' });
  }

  const favoritaInt = favorita === true || favorita === 1 ? 1 : 0;

  const query = 'UPDATE cartas SET favorita = ? WHERE id = ? AND usuario_id = ?';
  db.run(query, [favoritaInt, cartaId, usuario_id], function (err) {
    if (err) {
      console.error('Erro ao atualizar favorita:', err.message);
      return res.status(500).json({ message: 'Erro ao atualizar favorita.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Carta não encontrada ou não pertence ao usuário.' });
    }
    return res.status(200).json({ message: 'Favorita atualizada com sucesso!' });
  });
});

// =====================
// ATUALIZAR WISHLIST
// =====================
app.patch('/api/cartas/:cartaId/wishlist', (req, res) => {
  const cartaId = req.params.cartaId;
  const { usuario_id, wishlist } = req.body;

  if (typeof wishlist !== 'boolean' && wishlist !== 0 && wishlist !== 1) {
    return res.status(400).json({ message: 'Campo wishlist deve ser booleano.' });
  }
  if (!usuario_id) {
    return res.status(400).json({ message: 'usuario_id é obrigatório.' });
  }

  const wishlistInt = wishlist === true || wishlist === 1 ? 1 : 0;

  const query = 'UPDATE cartas SET wishlist = ? WHERE id = ? AND usuario_id = ?';
  db.run(query, [wishlistInt, cartaId, usuario_id], function (err) {
    if (err) {
      console.error('Erro ao atualizar wishlist:', err.message);
      return res.status(500).json({ message: 'Erro ao atualizar wishlist.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Carta não encontrada ou não pertence ao usuário.' });
    }
    return res.status(200).json({ message: 'Wishlist atualizada com sucesso!' });
  });
});

// =====================
// BUSCAR CARTAS COM FILTROS
// =====================
app.get('/api/cartas', (req, res) => {
  const usuarioId = req.query.usuario_id;
  const favorita = req.query.favorita;
  const wishlist = req.query.wishlist;

  if (!usuarioId) return res.status(400).json({ message: 'usuario_id é obrigatório na query string.' });

  let query = `
    SELECT cartas.*, sets.nome AS nome_set_completo
    FROM cartas
    LEFT JOIN sets ON cartas."set" = sets.codigo
    WHERE cartas.usuario_id = ?
  `;
  const params = [usuarioId];

  if (favorita === '1' || favorita === '0') {
    query += ' AND cartas.favorita = ?';
    params.push(favorita);
  }
  if (wishlist === '1' || wishlist === '0') {
    query += ' AND cartas.wishlist = ?';
    params.push(wishlist);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Erro ao buscar cartas.' });
    }
    return res.status(200).json(rows);
  });
});

// =====================
// ENDPOINT DE TESTE
// =====================
app.get('/', (req, res) => {
  res.send('Servidor do Gerenciador de Cartas Pokémon funcionando!');
});

// =====================
// IMPORTAR SETS EM MASSA
// =====================
app.post('/api/sets/importar', (req, res) => {
  const sets = req.body.sets;

  if (!Array.isArray(sets)) {
    return res.status(400).json({ message: 'Envie um array de sets.' });
  }

  let inseridos = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO sets (codigo, nome) VALUES (?, ?)');

  sets.forEach(set => {
    if (set.codigo && set.nome) {
      stmt.run(set.codigo, set.nome, (err) => {
        if (!err) inseridos++;
      });
    }
  });

  stmt.finalize(() => {
    res.json({ message: `Importados ${inseridos} sets.` });
  });
});

// =====================
// INICIA SERVIDOR
// =====================
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});