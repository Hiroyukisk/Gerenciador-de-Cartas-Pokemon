const usuarioId = localStorage.getItem('usuarioId'); // pega o ID do usuário salvo no localStorage

if (!usuarioId) {
  // se não tiver usuário logado, manda pra página de login
  window.location.href = '/login.html';
} else {
  // se tiver, inicia a página
  initPage();
}

let cartasCache = []; // cache das cartas pra não ficar chamando API toda hora
let cartasSelecionadas = new Set(); // conjunto das cartas selecionadas pelo checkbox

async function initPage() {
  // função principal que roda tudo quando a página inicia
  await buscarUsuario(usuarioId); // pega info do usuário e mostra email
  await carregarWishlist(usuarioId); // carrega as cartas da wishlist do usuário
  registrarEventos(); // registra eventos fixos, tipo fechar modal da arte expandida
  atualizarContadorWishlist(usuarioId); // atualiza contador que mostra quantas cartas tem
  registrarEventoBusca(); // ativa o filtro da busca pra ir atualizando na hora
  registrarEventoExcluirSelecionadas(); // habilita botão excluir múltiplas cartas
  registrarEventoMandarSelecionadas(); // habilita botão pra mandar cartas pra dashboard
}

async function fetchJson(url, options = {}) {
  // função genérica pra fazer fetch e já tratar erro, retorna JSON
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
  // busca info do usuário via API e atualiza nome/email na página
  try {
    const data = await fetchJson(`/api/usuario/${id}`);
    if (data.email) {
      document.getElementById('nome-usuario').textContent = data.email;
    }
  } catch {}
}

async function carregarWishlist(usuarioId, filtro = '') {
  // carrega as cartas da wishlist, com filtro opcional de busca por nome
  try {
    if (!cartasCache.length) {
      // se cache vazio, busca do backend
      cartasCache = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=1`);
    }

    let cartasFiltradas = cartasCache;

    if (filtro.trim() !== '') {
      // se tiver filtro, filtra as cartas pelo nome
      const filtroLower = filtro.toLowerCase();
      cartasFiltradas = cartasCache.filter(carta => carta.nome.toLowerCase().includes(filtroLower));
    }

    const container = document.getElementById('cartas-container');
    container.innerHTML = ''; // limpa container antes de renderizar

    document.getElementById('contador-cartas').textContent = cartasFiltradas.length; // atualiza contador

    if (cartasFiltradas.length === 0) {
      // se não achar cartas, mostra mensagem amigável
      container.innerHTML = '<p class="text-center text-gray-500 w-full">Nenhuma carta na wishlist.</p>';
      return;
    }

    // para cada carta filtrada, cria o card com os dados e adiciona evento checkbox
    cartasFiltradas.forEach(carta => {
      const card = document.createElement('div');
      card.className = 'carta-box';

      const imagemUrl = carta.url_imagem || 'pokeball.png'; // fallback pra pokeball se não tiver imagem
      const raridade = carta.raridade ? carta.raridade.split(',')[0].trim() : 'N/A'; // só o primeiro tipo de raridade

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

      // adiciona evento no checkbox pra adicionar/remover do set cartasSelecionadas
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          cartasSelecionadas.add(id.toString());
        } else {
          cartasSelecionadas.delete(id.toString());
        }
        atualizarBotaoExcluir(); // atualiza texto do botão excluir
      });

      container.appendChild(card);
    });

    atualizarBotaoExcluir(); // atualiza botão excluir no fim

  } catch (e) {
    // se der erro na requisição ou renderização, mostra mensagem de erro
    console.error('Erro ao carregar wishlist:', e);
    const container = document.getElementById('cartas-container');
    container.innerHTML = '<p class="text-center text-red-500 w-full">Erro ao carregar wishlist.</p>';
  }
}

function atualizarBotaoExcluir() {
  // atualiza o texto e visibilidade do botão excluir selecionadas
  const btn = document.getElementById('btn-excluir-selecionadas');
  btn.style.display = 'inline-flex';  // deixa sempre visível
  const count = cartasSelecionadas.size;
  btn.textContent = count > 0 ? `Excluir Selecionadas (${count})` : 'Excluir Selecionadas';
}

function registrarEventoExcluirSelecionadas() {
  // evento do botão excluir múltiplas cartas selecionadas
  const btn = document.getElementById('btn-excluir-selecionadas');
  btn.addEventListener('click', () => {
    if (cartasSelecionadas.size === 0) {
      showPopup('Nenhuma carta selecionada para exclusão.');
      return;
    }

    // confirma exclusão com popup, se confirmado remove uma a uma via API
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
          // remove do cache e limpa seleção
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
  // evento do botão mandar selecionadas pra dashboard (tirar da wishlist)
  const btn = document.getElementById('btn-mandar-selecionadas');
  btn.addEventListener('click', () => {
    if (cartasSelecionadas.size === 0) {
      showPopup('Nenhuma carta selecionada para enviar à dashboard.');
      return;
    }

    // confirma e manda PATCH na API pra tirar wishlist
    showPopup(
      `Quer mesmo mover ${cartasSelecionadas.size} carta(s) selecionada(s) da wishlist para a dashboard?`,
      true,
      async () => {
        try {
          for (const cartaId of cartasSelecionadas) {
            await fetchJson(`/api/cartas/${cartaId}/wishlist`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ usuario_id: usuarioId, wishlist: false }),
            });
          }
          showPopup(`${cartasSelecionadas.size} carta(s) movida(s) para a dashboard.`);
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
  // remove carta individual com confirmação e chamada DELETE
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
  // move carta individual pra dashboard tirando da wishlist, com confirmação e PATCH
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
  // abre modal com a imagem da carta maior
  if (!src) {
    showPopup('Nenhuma imagem para expandir.');
    return;
  }
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.style.display = 'flex'; // mostra modal
}

function fecharModalArte() {
  // fecha o modal de arte expandida e limpa imagem
  const modal = document.getElementById('modal-arte-expandida');
  modal.style.display = 'none';
  document.getElementById('img-arte-expandida').src = '';
}

function showPopup(message, hasCancel = false, onConfirm = null, onCancel = null) {
  // mostra popup customizado, com ou sem botão cancelar
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
  // eventos fixos que só registramos uma vez
  const modalArte = document.getElementById('modal-arte-expandida');
  if (modalArte) modalArte.addEventListener('click', fecharModalArte); // fecha modal se clicar fora da imagem
}

async function atualizarContadorWishlist(usuarioId) {
  // atualiza contador das cartas na wishlist puxando direto do backend
  try {
    const cartasWishlist = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=1`);
    document.getElementById('contador-cartas').textContent = cartasWishlist.length || 0;
  } catch {
    document.getElementById('contador-cartas').textContent = 0;
  }
}

function registrarEventoBusca() {
  // registra o evento de digitar na busca e filtra a wishlist em tempo real
  const buscaInput = document.getElementById('busca');
  buscaInput.addEventListener('input', () => {
    carregarWishlist(usuarioId, buscaInput.value);
  });
}