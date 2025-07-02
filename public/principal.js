// Cria a animação fadeSlideIn para as cartas
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes fadeSlideIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
document.head.appendChild(styleSheet);

const usuarioId = localStorage.getItem('usuarioId');
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  buscarUsuario(usuarioId);
  carregarCartas(usuarioId);
}

async function buscarUsuario(id) {
  try {
    const res = await fetch(`/api/usuario/${id}`);
    if (!res.ok) throw new Error('Erro na resposta da API');
    const data = await res.json();
    if (data.email) {
      document.getElementById('nome-usuario').textContent = data.email;
    } else {
      console.error('Usuário não encontrado');
    }
  } catch (e) {
    console.error('Erro ao buscar usuário:', e);
  }
}

async function carregarCartas(usuarioId) {
  try {
    const res = await fetch(`/api/cartas?usuario_id=${usuarioId}&wishlist=0`);
    if (!res.ok) throw new Error('Erro na resposta da API cartas');
    const cartas = await res.json();

    document.getElementById('contador-cartas').textContent = cartas.length;

    const container = document.getElementById('cartas-container');
    container.innerHTML = ''; // limpa cartas antigas

    const acoesDiv = document.getElementById('acoes-cartas');

    // Cria botao adicionar, se nao existir
    if (!document.getElementById('btn-adicionar')) {
      const btnAdicionar = document.createElement('div');
      btnAdicionar.id = 'btn-adicionar';
      btnAdicionar.className = 'cursor-pointer bg-green-100 rounded shadow p-4 flex flex-col items-center justify-center text-green-700 font-bold select-none';
      btnAdicionar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:#166534;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Adicionar Carta</span>
      `;
      btnAdicionar.onclick = () => window.location.href = 'adicionar.html';
      acoesDiv.appendChild(btnAdicionar);
    }

    // Cria botao excluir selecionadas, se nao existir
    if (!document.getElementById('btn-excluir')) {
      const btnExcluir = document.createElement('button');
      btnExcluir.id = 'btn-excluir';
      btnExcluir.textContent = 'Excluir selecionadas';
      btnExcluir.className = 'px-5 py-3 rounded shadow text-white font-semibold';
      btnExcluir.style.backgroundColor = '#dc2626'; // red-600
      btnExcluir.style.cursor = 'pointer';
      btnExcluir.onmouseover = () => btnExcluir.style.backgroundColor = '#b91c1c'; // red-700
      btnExcluir.onmouseout = () => btnExcluir.style.backgroundColor = '#dc2626';
      btnExcluir.onclick = excluirSelecionadas;
      acoesDiv.appendChild(btnExcluir);
    }

    // Renderiza as cartas
    cartas.forEach(carta => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'carta-box';

      const imagemUrl = carta.url_imagem || 'pokeball.png';
      const raridades = carta.raridade ? carta.raridade.split(',').map(r => r.trim()) : ['N/A'];
      const raridadeMaisAlta = raridades[0];
      const estrelaFavorita = carta.favorita == 1 ? '⭐' : '☆';

      cardDiv.innerHTML = `
        <input type="checkbox" class="delete-checkbox checkbox-delete" data-carta-id="${carta.id}" title="Selecionar para excluir">
        <div class="img-wrapper">
          <div class="expand-button" onclick="expandirArte('${imagemUrl}')">🔍</div>
          <img src="${imagemUrl}" alt="${carta.nome}" onerror="this.src='pokeball.png'">
          <button onclick="toggleFavorita(${carta.id}, ${carta.favorita})" 
            style="position:absolute; top:10px; left:10px; font-size: 24px; background: transparent; border: none; cursor: pointer;">
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
            <span class="set">${carta.nome_set_completo || carta.set || 'N/A'}</span>
          </div>
          <div class="flex space-x-2 w-full justify-center mt-4">
            <button onclick="editarCarta('${carta.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">✏️</button>
            <button onclick="confirmarExcluirCarta('${carta.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">❌</button>
          </div>
        </div>
      `;

      container.appendChild(cardDiv);
    });

    // Animação
    animarCartas();

    // Reaplica filtro depois de carregar cartas
    aplicarFiltroCartas();

  } catch (e) {
    console.error('Erro ao carregar cartas:', e);
    document.getElementById('cartas-container').innerHTML = `
      <div class="col-span-full text-center text-red-500">
        Erro ao carregar cartas. Recarregue a página.
      </div>
    `;
  }
}

async function excluirSelecionadas() {
  const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
  if (checkboxes.length === 0) {
    showPopup('Nenhuma carta selecionada para exclusão.');
    return;
  }

  showPopup(`Tem certeza que quer excluir ${checkboxes.length} cartas?`, true, async () => {
    let sucesso = 0, falha = 0;

    for (const cb of checkboxes) {
      const cartaId = cb.dataset.cartaId;

      try {
        const res = await fetch(`/api/carta/${cartaId}`);
        if (!res.ok) throw new Error('Erro ao buscar carta');

        const carta = await res.json();
        if (carta.favorita === 1) {
          falha++;
          console.warn(`Carta ${cartaId} é favorita e não foi excluída.`);
          continue;
        }

        const delRes = await fetch(`/api/cartas/${cartaId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuarioId }),
        });
        if (!delRes.ok) throw new Error('Erro ao excluir carta');
        sucesso++;
      } catch (e) {
        falha++;
        console.error(`Erro ao excluir carta ${cartaId}:`, e);
      }
    }

    showPopup(`Exclusão finalizada: ${sucesso} excluídas, ${falha} não excluídas.`);
    carregarCartas(usuarioId);
  });
}

async function confirmarExcluirCarta(cartaId) {
  try {
    const res = await fetch(`/api/carta/${cartaId}`);
    if (!res.ok) throw new Error('Erro ao buscar carta');

    const carta = await res.json();

    if (carta.favorita === 1) {
      showPopup('Essa carta está marcada como favorita e não pode ser excluída.', false);
      return;
    }

    showPopup('Quer mesmo excluir essa carta?', true, () => excluirCarta(cartaId));
  } catch (e) {
    console.error('Erro ao verificar carta favorita:', e);
    alert('Erro ao verificar carta favorita');
  }
}

async function excluirCarta(cartaId) {
  try {
    const res = await fetch(`/api/cartas/${cartaId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId })
    });
    if (!res.ok) throw new Error('Falha ao excluir');
    carregarCartas(usuarioId);
  } catch (e) {
    console.error('Erro ao excluir carta:', e);
    alert('Erro ao excluir carta');
  }
}

function editarCarta(cartaId) {
  window.location.href = `editar.html?id=${cartaId}`;
}

function aplicarFiltroCartas() {
  const filtro = buscaInput?.value?.toLowerCase() || '';
  const cartas = document.querySelectorAll('#cartas-container > div.carta-box');
  cartas.forEach(carta => {
    const textoCarta = carta.textContent.toLowerCase();
    carta.classList.toggle('hidden', !textoCarta.includes(filtro));
  });
}

const buscaInput = document.getElementById('busca');
if (buscaInput) {
  buscaInput.addEventListener('input', aplicarFiltroCartas);
}

function expandirArte(src) {
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.classList.add('show');
}

function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.classList.remove('show');
  modal.addEventListener('transitionend', () => {
    if (!modal.classList.contains('show')) {
      document.getElementById('img-arte-expandida').src = '';
    }
  }, { once: true });
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

const linkSair = document.querySelector('aside nav a[href="login.html"]');
if (linkSair) {
  linkSair.addEventListener('click', e => {
    e.preventDefault();
    showPopup(
      'Quer mesmo sair?',
      true,
      () => {
        localStorage.clear();
        window.location.href = 'login.html';
      }
    );
  });
}

async function toggleFavorita(cartaId, atualFavorita) {
  const novaFavorita = atualFavorita == 1 ? 0 : 1;

  try {
    const res = await fetch(`/api/cartas/${cartaId}/favorita`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, favorita: novaFavorita })
    });
    if (!res.ok) throw new Error('Falha ao atualizar favorita');

    // Atualiza só o card da carta no DOM, sem recarregar tudo
    atualizarCartaFavoritaNoDOM(cartaId, novaFavorita);

  } catch (e) {
    console.error('Erro ao atualizar favorita:', e);
    alert('Erro ao atualizar carta favorita');
  }
}

// Função que atualiza só o botão favorita na carta no DOM
function atualizarCartaFavoritaNoDOM(cartaId, novaFavorita) {
  // Encontra o card no container
  const container = document.getElementById('cartas-container');
  // Os cards não têm ID, mas tem checkbox com data-carta-id, pega o pai (card)
  const checkbox = container.querySelector(`.delete-checkbox[data-carta-id="${cartaId}"]`);
  if (!checkbox) return; // se não achou, para aqui

  const cardDiv = checkbox.closest('.carta-box');
  if (!cardDiv) return;

  // Atualiza o botão da estrela, que fica na div .img-wrapper > button
  const btnFavorita = cardDiv.querySelector('.img-wrapper > button');
  if (!btnFavorita) return;

  // Atualiza o texto da estrela
  btnFavorita.textContent = novaFavorita === 1 ? '⭐' : '☆';

  // Atualiza o onclick do botão pra ter o novo estado correto (pra próxima troca)
  btnFavorita.setAttribute('onclick', `toggleFavorita(${cartaId}, ${novaFavorita})`);
}

function animarCartas() {
  const cartas = document.querySelectorAll('#cartas-container .carta-box');
  cartas.forEach((carta) => {
    carta.style.opacity = 0;
    carta.style.animation = `fadeSlideIn 0.6s ease forwards`;
    // removido animationDelay
  });
}


const modal = document.getElementById('modal-arte-expandida');
modal.addEventListener('click', e => {
  if (e.target === modal) {
    fecharModalArte();
  }
});
