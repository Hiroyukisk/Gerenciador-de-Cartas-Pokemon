const usuarioId = localStorage.getItem('usuarioId');

if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  initPage();
}

let cartasCache = [];
let cartasSelecionadas = new Set();

async function initPage() {
  await buscarUsuario(usuarioId);
  await carregarWishlist(usuarioId);
  registrarEventos();
  atualizarContadorWishlist(usuarioId);
  registrarEventoBusca();
  registrarEventoExcluirSelecionadas();
  registrarEventoMandarSelecionadas();
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Erro ao fazer fetch em ${url}:`, err);
    throw err;
  }
}

async function buscarUsuario(id) {
  try {
    const data = await fetchJson(`/api/usuario/${id}`);
    if (data.email) {
      document.getElementById('nome-usuario').textContent = data.email;
    }
  } catch {}
}

async function carregarWishlist(usuarioId, filtro = '') {
  try {
    if (!cartasCache.length) {
      cartasCache = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=1`);
    }

    let cartasFiltradas = cartasCache;

    if (filtro.trim() !== '') {
      const filtroLower = filtro.toLowerCase();
      cartasFiltradas = cartasCache.filter(carta => carta.nome.toLowerCase().includes(filtroLower));
    }

    const container = document.getElementById('cartas-container');
    container.innerHTML = '';

    document.getElementById('contador-cartas').textContent = cartasFiltradas.length;

    if (cartasFiltradas.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 w-full">Nenhuma carta na wishlist.</p>';
      return;
    }

    cartasFiltradas.forEach(carta => {
      const card = document.createElement('div');
      card.className = 'carta-box';

      const imagemUrl = carta.url_imagem || 'pokeball.png';
      const raridade = carta.raridade ? carta.raridade.split(',')[0].trim() : 'N/A';

      card.innerHTML = `
        <input type="checkbox" data-id="${carta.id}" ${cartasSelecionadas.has(carta.id.toString()) ? 'checked' : ''} />
        <div class="img-wrapper">
          <div class="expand-button" title="Expandir arte" onclick="expandirArte('${imagemUrl}')">🔍</div>
          <img src="${imagemUrl}" alt="${carta.nome}" onerror="this.src='pokeball.png'">
        </div>
        <div class="carta-info">
          <div class="nome" title="${carta.nome}">${carta.nome}</div>
          <div class="detalhes">
            <span class="quantidade">Qtd: ${carta.quantidade || 1}</span>
            <span class="raridade">${raridade}</span>
            <span class="ano">${carta.ano || 'N/A'}</span>
            <span class="idioma">${carta.idioma || 'N/A'}</span>
            <span class="set" title="${carta.nome_set_completo || carta.set || 'N/A'}">${carta.nome_set_completo || carta.set || 'N/A'}</span>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn-fino btn-remover" onclick="removerDaWishlist('${carta.id}')">Remover</button>
            <button class="btn-fino btn-dashboard" onclick="moverPraDashboard('${carta.id}')">Mandar pra Dashboard</button>
          </div>
        </div>
      `;

      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          cartasSelecionadas.add(id.toString());
        } else {
          cartasSelecionadas.delete(id.toString());
        }
        atualizarBotaoExcluir();
      });

      container.appendChild(card);
    });

    atualizarBotaoExcluir();

  } catch (e) {
    console.error('Erro ao carregar wishlist:', e);
    const container = document.getElementById('cartas-container');
    container.innerHTML = '<p class="text-center text-red-500 w-full">Erro ao carregar wishlist.</p>';
  }
}

function atualizarBotaoExcluir() {
  const btn = document.getElementById('btn-excluir-selecionadas');
  btn.style.display = 'inline-flex';  // sempre aparece
  const count = cartasSelecionadas.size;
  btn.textContent = count > 0 ? `Excluir Selecionadas (${count})` : 'Excluir Selecionadas';
}

function registrarEventoExcluirSelecionadas() {
  const btn = document.getElementById('btn-excluir-selecionadas');
  btn.addEventListener('click', () => {
    if (cartasSelecionadas.size === 0) {
      showPopup('Nenhuma carta selecionada para exclusão.');
      return;
    }

    showPopup(
      `Tem certeza que quer remover ${cartasSelecionadas.size} carta(s) da wishlist?`,
      true,
      async () => {
        try {
          for (const cartaId of cartasSelecionadas) {
            await fetchJson(`/api/cartas/${cartaId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ usuario_id: usuarioId })
            });
          }

          showPopup(`${cartasSelecionadas.size} carta(s) removida(s) da wishlist.`);
          cartasCache = cartasCache.filter(carta => !cartasSelecionadas.has(carta.id.toString()));
          cartasSelecionadas.clear();
          carregarWishlist(usuarioId, document.getElementById('busca').value);
          atualizarContadorWishlist(usuarioId);
        } catch (e) {
          console.error('Erro ao remover cartas:', e);
          showPopup('Falha ao remover cartas. Tente novamente.');
        }
      }
    );
  });
}

function registrarEventoMandarSelecionadas() {
  const btn = document.getElementById('btn-mandar-selecionadas');
  btn.addEventListener('click', () => {
    if (cartasSelecionadas.size === 0) {
      showPopup('Nenhuma carta selecionada para enviar à dashboard.');
      return;
    }

    showPopup(
      `Quer mesmo mover ${cartasSelecionadas.size} carta(s) selecionada(s) da wishlist para a dashboard?`,
      true,
      async () => {
        try {
          // Faz PATCH em todas as cartas selecionadas pra wishlist: false
          for (const cartaId of cartasSelecionadas) {
            await fetchJson(`/api/cartas/${cartaId}/wishlist`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ usuario_id: usuarioId, wishlist: false }),
            });
          }
          showPopup(`${cartasSelecionadas.size} carta(s) movida(s) para a dashboard.`);
          // Atualiza cache e interface
          cartasCache = cartasCache.filter(carta => !cartasSelecionadas.has(carta.id.toString()));
          cartasSelecionadas.clear();
          carregarWishlist(usuarioId, document.getElementById('busca').value);
          atualizarContadorWishlist(usuarioId);
        } catch (e) {
          console.error('Erro ao mover cartas:', e);
          showPopup('Falha ao mover cartas. Tente novamente.');
        }
      }
    );
  });
}


function removerDaWishlist(cartaId) {
  showPopup(
    'Tem certeza que quer remover essa carta da wishlist?',
    true,
    async () => {
      try {
        await fetchJson(`/api/cartas/${cartaId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuarioId })
        });
        showPopup('Carta removida da wishlist.');
        cartasCache = cartasCache.filter(c => c.id.toString() !== cartaId.toString());
        cartasSelecionadas.delete(cartaId.toString());
        carregarWishlist(usuarioId, document.getElementById('busca').value);
        atualizarContadorWishlist(usuarioId);
      } catch (e) {
        console.error('Erro ao remover carta:', e);
        showPopup('Falha ao remover carta. Tente novamente.');
      }
    }
  );
}

function moverPraDashboard(cartaId) {
  showPopup(
    'Quer mover essa carta da wishlist para a dashboard?',
    true,
    async () => {
      try {
        await fetchJson(`/api/cartas/${cartaId}/wishlist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuarioId, wishlist: false })
        });
        showPopup('Carta movida para a dashboard.');
        cartasCache = cartasCache.filter(c => c.id.toString() !== cartaId.toString());
        cartasSelecionadas.delete(cartaId.toString());
        carregarWishlist(usuarioId, document.getElementById('busca').value);
        atualizarContadorWishlist(usuarioId);
      } catch (e) {
        console.error('Erro ao mover carta:', e);
        showPopup('Falha ao mover carta. Tente novamente.');
      }
    }
  );
}

function expandirArte(src) {
  if (!src) {
    showPopup('Nenhuma imagem para expandir.');
    return;
  }
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

function showPopup(message, hasCancel = false, onConfirm = null, onCancel = null) {
  const overlay = document.getElementById('custom-popup-overlay');
  const popupMessage = document.getElementById('custom-popup-message');
  const okButton = document.getElementById('custom-popup-ok');
  const cancelButton = document.getElementById('custom-popup-cancel');

  popupMessage.textContent = message;
  overlay.classList.remove('hidden');
  cancelButton.classList.toggle('hidden', !hasCancel);

  const closePopup = () => overlay.classList.add('hidden');

  okButton.onclick = () => {
    closePopup();
    if (onConfirm) onConfirm();
  };
  cancelButton.onclick = () => {
    closePopup();
    if (onCancel) onCancel();
  };
}

function registrarEventos() {
  const modalArte = document.getElementById('modal-arte-expandida');
  if (modalArte) modalArte.addEventListener('click', fecharModalArte);
}

async function atualizarContadorWishlist(usuarioId) {
  try {
    const cartasWishlist = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=1`);
    document.getElementById('contador-cartas').textContent = cartasWishlist.length || 0;
  } catch {
    document.getElementById('contador-cartas').textContent = 0;
  }
}

function registrarEventoBusca() {
  const buscaInput = document.getElementById('busca');
  buscaInput.addEventListener('input', () => {
    carregarWishlist(usuarioId, buscaInput.value);
  });
}