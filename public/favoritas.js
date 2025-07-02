const usuarioId = localStorage.getItem('usuarioId');
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  buscarUsuario(usuarioId);
  carregarCartasFavoritas(usuarioId);
}

async function buscarUsuario(id) {
  const res = await fetch(`/api/usuario/${id}`);
  if (res.ok) {
    const data = await res.json();
    if (data.email) document.getElementById('nome-usuario').textContent = data.email;
  }
}

async function carregarCartasFavoritas(usuarioId) {
  const res = await fetch(`/api/cartas?usuario_id=${usuarioId}&favorita=1`);
  if (!res.ok) return;

  const cartas = await res.json();
  const container = document.getElementById('cartas-container');
  container.innerHTML = '';
  document.getElementById('contador-cartas').textContent = cartas.length;

  cartas.forEach(carta => {
    const estrelaFavorita = carta.favorita == 1 ? '⭐' : '☆';
    const raridades = carta.raridade ? carta.raridade.split(',').map(r => r.trim()) : ['N/A'];
    const raridadeMaisAlta = raridades[0];
    const imagemUrl = carta.url_imagem || 'pokeball.png';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'carta-box';
    cardDiv.innerHTML = `
      <div class="img-wrapper">
        <div class="expand-button" onclick="expandirArte('${imagemUrl}')">🔍</div>
        <img src="${imagemUrl}" alt="${carta.nome}" onerror="this.src='pokeball.png'">
        <button onclick="toggleFavorita(${carta.id}, ${carta.favorita})" style="position:absolute; top:10px; left:10px; font-size:24px; background:transparent; border:none; cursor:pointer;">
          ${estrelaFavorita}
        </button>
      </div>
      <div class="carta-info">
        <div class="nome">${carta.nome}</div>
        <div class="detalhes">
          <span class="quantidade">Qtd: ${carta.quantidade || 1}</span>
          <span class="raridade">${raridadeMaisAlta}</span>
          <span class="ano">${carta.ano || 'N/A'}</span>
          <span class="idioma">${carta.idioma || 'N/A'}</span>
          <span class="set">${carta.set || 'N/A'}</span>
        </div>
        <div class="flex space-x-2 w-full justify-center mt-4">
          <button onclick="editarCarta('${carta.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">✏️</button>
          <button onclick="confirmarExcluirCarta('${carta.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">❌</button>
        </div>
      </div>
    `;
    container.appendChild(cardDiv);
  });

  filtrarCartas(); // Aplica o filtro atual após carregar
}

function expandirArte(src) {
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.style.display = 'flex';
}

function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.style.display = 'none';
  document.getElementById('img-arte-expandida').src = '';
}

async function toggleFavorita(cartaId, atualFavorita) {
  const novaFavorita = atualFavorita == 1 ? 0 : 1;
  const res = await fetch(`/api/cartas/${cartaId}/favorita`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId, favorita: novaFavorita })
  });
  if (res.ok) carregarCartasFavoritas(usuarioId);
}

function editarCarta(cartaId) {
  window.location.href = `editar.html?id=${cartaId}`;
}

async function confirmarExcluirCarta(cartaId) {
  const res = await fetch(`/api/cartas/${cartaId}`);
  if (!res.ok) return;
  const carta = await res.json();
  if (carta.favorita === 1) return showPopup('Essa carta está marcada como favorita e não pode ser excluída.', false);

  showPopup('Quer mesmo excluir essa carta?', true, () => excluirCarta(cartaId));
}

async function excluirCarta(cartaId) {
  const res = await fetch(`/api/cartas/${cartaId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId })
  });
  if (res.ok) carregarCartasFavoritas(usuarioId);
}

function showPopup(message, hasCancel = false, onConfirm = null) {
  const overlay = document.getElementById('custom-popup-overlay');
  document.getElementById('custom-popup-message').textContent = message;
  const cancelButton = document.getElementById('custom-popup-cancel');
  cancelButton.classList.toggle('hidden', !hasCancel);
  overlay.classList.remove('hidden');

  document.getElementById('custom-popup-ok').onclick = () => {
    overlay.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  cancelButton.onclick = () => overlay.classList.add('hidden');
}

// Função que filtra as cartas no DOM com base no input
function filtrarCartas() {
  const filtro = document.getElementById('busca').value.toLowerCase();
  document.querySelectorAll('#cartas-container > div').forEach(carta => {
    carta.classList.toggle('hidden', !carta.textContent.toLowerCase().includes(filtro));
  });
}

// Registra o listener do input só uma vez no começo
document.getElementById('busca').addEventListener('input', filtrarCartas);
