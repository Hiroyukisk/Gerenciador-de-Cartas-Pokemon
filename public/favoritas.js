// Pega o ID do usuário do localStorage
const usuarioId = localStorage.getItem('usuarioId');

// Se não tiver usuário logado, redireciona pro login
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  // Se tiver, busca os dados do usuário e carrega as cartas favoritas
  buscarUsuario(usuarioId);
  carregarCartasFavoritas(usuarioId);
}

// Busca os dados do usuário pela API
async function buscarUsuario(id) {
  const res = await fetch(`/api/usuario/${id}`);
  if (res.ok) {
    const data = await res.json();
    // Se tiver email, mostra no elemento 'nome-usuario'
    if (data.email) document.getElementById('nome-usuario').textContent = data.email;
  }
}

// Carrega as cartas favoritas do usuário pela API
async function carregarCartasFavoritas(usuarioId) {
  const res = await fetch(`/api/cartas?usuario_id=${usuarioId}&favorita=1`);
  if (!res.ok) return;

  const cartas = await res.json();
  const container = document.getElementById('cartas-container');
  container.innerHTML = ''; // Limpa container antes de adicionar
  document.getElementById('contador-cartas').textContent = cartas.length; // Atualiza contador

  // Pra cada carta, cria o card e adiciona no container
  cartas.forEach(carta => {
    // Define estrela cheia ou vazia pra favorita
    const estrelaFavorita = carta.favorita == 1 ? '⭐' : '☆';
    // Divide as raridades separadas por vírgula e pega a mais alta
    const raridades = carta.raridade ? carta.raridade.split(',').map(r => r.trim()) : ['N/A'];
    const raridadeMaisAlta = raridades[0];
    // Usa imagem da carta ou pokeball padrão
    const imagemUrl = carta.url_imagem || 'pokeball.png';

    // Cria div do card com a estrutura HTML
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
    container.appendChild(cardDiv); // Adiciona a carta no container
  });

  filtrarCartas(); // Aplica o filtro atual após carregar as cartas
}

// Abre modal mostrando a arte ampliada da carta
function expandirArte(src) {
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.style.display = 'flex'; // Mostra o modal
}

// Fecha o modal de arte expandida e limpa a imagem
function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.style.display = 'none'; // Esconde modal
  document.getElementById('img-arte-expandida').src = ''; // Limpa src da imagem
}

// Alterna entre favorita e não favorita (PATCH na API)
async function toggleFavorita(cartaId, atualFavorita) {
  const novaFavorita = atualFavorita == 1 ? 0 : 1;
  const res = await fetch(`/api/cartas/${cartaId}/favorita`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId, favorita: novaFavorita })
  });
  if (res.ok) carregarCartasFavoritas(usuarioId); // Recarrega cartas depois de atualizar
}

// Redireciona pra página de edição da carta
function editarCarta(cartaId) {
  window.location.href = `editar.html?id=${cartaId}`;
}

// Confirma exclusão da carta, só permite se não for favorita
async function confirmarExcluirCarta(cartaId) {
  const res = await fetch(`/api/cartas/${cartaId}`);
  if (!res.ok) return;
  const carta = await res.json();
  if (carta.favorita === 1) return showPopup('Essa carta está marcada como favorita e não pode ser excluída.', false);

  // Mostra popup pra confirmar exclusão, chama excluirCarta se confirmado
  showPopup('Quer mesmo excluir essa carta?', true, () => excluirCarta(cartaId));
}

// Exclui a carta pela API (DELETE) e recarrega as cartas
async function excluirCarta(cartaId) {
  const res = await fetch(`/api/cartas/${cartaId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId })
  });
  if (res.ok) carregarCartasFavoritas(usuarioId);
}

// Mostra popup customizado, com opção de cancelar se quiser
function showPopup(message, hasCancel = false, onConfirm = null) {
  const overlay = document.getElementById('custom-popup-overlay');
  document.getElementById('custom-popup-message').textContent = message;
  const cancelButton = document.getElementById('custom-popup-cancel');
  cancelButton.classList.toggle('hidden', !hasCancel); // Mostra ou esconde botão cancelar
  overlay.classList.remove('hidden'); // Mostra popup

  // Clique em OK fecha popup e chama callback se tiver
  document.getElementById('custom-popup-ok').onclick = () => {
    overlay.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  // Clique em cancelar só fecha popup
  cancelButton.onclick = () => overlay.classList.add('hidden');
}

// Filtra as cartas no DOM com base no valor do input de busca
function filtrarCartas() {
  const filtro = document.getElementById('busca').value.toLowerCase();
  document.querySelectorAll('#cartas-container > div').forEach(carta => {
    // Esconde carta se não tiver texto que bate com o filtro
    carta.classList.toggle('hidden', !carta.textContent.toLowerCase().includes(filtro));
  });
}

// Registra listener no campo de busca, chama filtrarCartas a cada input
document.getElementById('busca').addEventListener('input', filtrarCartas);
