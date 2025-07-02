const sqlite3 = require('sqlite3').verbose(); // importa sqlite3 com suporte a logs detalhados
const path = require('path'); // importa módulo path pra manipular caminhos

// cria o caminho completo pro arquivo do banco de dados
const db_name = path.join(__dirname, 'database', 'pokedex.db');

// abre conexão com o banco de dados SQLite
const db = new sqlite3.Database(db_name, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message); // erro se não conseguir abrir
  } else {
    console.log('Banco de dados conectado!'); // sucesso na conexão
  }
});

// executa as queries em série pra garantir ordem correta
db.serialize(() => {
  // cria tabela de usuários se não existir
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sobrenome TEXT NOT NULL,
      data_nascimento TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  // cria tabela de sets (coleções) com código como chave primária
  db.run(`
    CREATE TABLE IF NOT EXISTS sets (
      codigo TEXT PRIMARY KEY,
      nome TEXT NOT NULL
    )
  `);

  // cria tabela de cartas, com colunas pra infos básicas + wishlist e favorita
  db.run(`
    CREATE TABLE IF NOT EXISTS cartas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,           -- ID do dono da carta
      nome TEXT NOT NULL,                    -- nome da carta
      numero TEXT NOT NULL,                  -- número no set
      "set" TEXT NOT NULL,                   -- código do set (chave estrangeira pra tabela sets)
      ano INTEGER,                           -- ano de lançamento
      quantidade INTEGER NOT NULL DEFAULT 1, -- quantidade da carta
      raridade TEXT,                         -- raridade da carta
      idioma TEXT,                           -- idioma da carta
      info TEXT,                             -- info extra opcional
      url_imagem TEXT,                       -- URL da imagem
      favorita INTEGER NOT NULL DEFAULT 0,   -- marca como favorita (0 ou 1)
      wishlist INTEGER NOT NULL DEFAULT 0,   -- marca como wishlist (0 ou 1)
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id),        -- vínculo com usuários
      FOREIGN KEY("set") REFERENCES sets(codigo)              -- vínculo com sets
    )
  `);

  // confere se a coluna wishlist existe (caso já existisse a tabela cartas sem essa coluna)
  db.get(`PRAGMA table_info(cartas);`, (err, row) => {
    if (err) {
      console.error('Erro ao verificar colunas da tabela cartas:', err.message);
      return;
    }

    db.all(`PRAGMA table_info(cartas);`, (err, columns) => {
      if (err) {
        console.error('Erro ao obter colunas da tabela cartas:', err.message);
        return;
      }

      const temWishlist = columns.some(c => c.name === 'wishlist'); // procura coluna wishlist
      if (!temWishlist) {
        // se não existir, adiciona coluna wishlist na tabela cartas
        db.run(`ALTER TABLE cartas ADD COLUMN wishlist INTEGER NOT NULL DEFAULT 0`, (err) => {
          if (err) {
            console.error('Erro ao adicionar coluna wishlist:', err.message);
          } else {
            console.log('Coluna wishlist adicionada com sucesso!');
          }
        });
      }
    });
  });
});

// exporta conexão com banco pra usar em outros arquivos
module.exports = db;