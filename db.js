const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db_name = path.join(__dirname, 'database', 'pokedex.db');

const db = new sqlite3.Database(db_name, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Banco de dados conectado!');
  }
});

db.serialize(() => {
  // Criar tabela de usuários
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

  db.run(`
  CREATE TABLE IF NOT EXISTS sets (
    codigo TEXT PRIMARY KEY,
    nome TEXT NOT NULL
  )
`);


  // Criar tabela de cartas com wishlist já no esquema
  db.run(`
    CREATE TABLE IF NOT EXISTS cartas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      numero TEXT NOT NULL,
      "set" TEXT NOT NULL,
      ano INTEGER,
      quantidade INTEGER NOT NULL DEFAULT 1,
      raridade TEXT,
      idioma TEXT,
      info TEXT,
      url_imagem TEXT,
      favorita INTEGER NOT NULL DEFAULT 0,
      wishlist INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY("set") REFERENCES sets(codigo)
    )
  `);

  // Se a tabela já existe, garantir que tenha a coluna wishlist (não dá erro se já tiver)
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

      const temWishlist = columns.some(c => c.name === 'wishlist');
      if (!temWishlist) {
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

module.exports = db;
