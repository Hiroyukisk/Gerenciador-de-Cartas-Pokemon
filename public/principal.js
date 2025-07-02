// Cria a animação fadeSlideIn para as cartas (fade + descer)
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

// Pega o ID do usuário no localStorage
const usuarioId = localStorage.getItem('usuarioId');

// Se não tem usuário, manda pro login
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  // Se tem, busca os dados do usuário e carrega as cartas dele
  buscarUsuario(usuarioId);
  carregarCartas(usuarioId);
}

// Busca os dados do usuário pela API e atualiza o nome na tela
async function buscarUsuario(id) {
  try {
    const res = await fetch(`/api/usuario/${id}`);
    if (!res.ok) throw new Error('Erro na resposta da API');
    const data = await res.json();
    if (data.email) {
      // Atualiza o nome do usuário no header
      document.getElementById('nome-usuario').textContent = data.email;
    } else {
      console.error('Usuário não encontrado');
    }
  } catch (e) {
    console.error('Erro ao buscar usuário:', e);
  }
}

// Busca as cartas do usuário (que não estão na wishlist) e mostra na tela
async function carregarCartas(usuarioId) {
  try {
    const res = await fetch(`/api/cartas?usuario_id=${usuarioId}&wishlist=0`);
    if (!res.ok) throw new Error('Erro na resposta da API cartas');
    const cartas = await res.json();

    // Atualiza o contador de cartas no sidebar
    document.getElementById('contador-cartas').textContent = cartas.length;

    // Pega o container das cartas e limpa tudo que tinha antes
    const container = document.getElementById('cartas-container');
    container.innerHTML = '';

    const acoesDiv = document.getElementById('acoes-cartas');

    // Cria botão "Adicionar Carta" se não existir (mas na verdade no HTML já tem)
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

    // Cria botão "Excluir selecionadas" se não existir
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

    // Pra cada carta, cria o HTML dela e adiciona no container
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

    // Anima as cartas (fade + slide)
    animarCartas();

    // Aplica o filtro da busca (se tiver algo digitado)
    aplicarFiltroCartas();

  } catch (e) {
    // Se deu erro, mostra mensagem vermelha no container
    console.error('Erro ao carregar cartas:', e);
    document.getElementById('cartas-container').innerHTML = `
      <div class="col-span-full text-center text-red-500">
        Erro ao carregar cartas. Recarregue a página.
      </div>
    `;
  }
}

// Exclui todas as cartas que estiverem selecionadas (checkbox marcado)
async function excluirSelecionadas() {
  const checkboxes = document.querySelectorAll('.delete-checkbox:checked');

  if (checkboxes.length === 0) {
    // Se não selecionou nada, avisa e para
    showPopup('Nenhuma carta selecionada para exclusão.');
    return;
  }

  // Confirma antes de excluir
  showPopup(`Tem certeza que quer excluir ${checkboxes.length} cartas?`, true, async () => {
    let sucesso = 0, falha = 0;

    for (const cb of checkboxes) {
      const cartaId = cb.dataset.cartaId;

      try {
        // Verifica se a carta é favorita, se for, não exclui
        const res = await fetch(`/api/carta/${cartaId}`);
        if (!res.ok) throw new Error('Erro ao buscar carta');

        const carta = await res.json();
        if (carta.favorita === 1) {
          falha++;
          console.warn(`Carta ${cartaId} é favorita e não foi excluída.`);
          continue;
        }

        // Exclui a carta pela API
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

    // Mostra o resultado final da exclusão
    showPopup(`Exclusão finalizada: ${sucesso} excluídas, ${falha} não excluídas.`);
    // Recarrega as cartas pra atualizar a lista
    carregarCartas(usuarioId);
  });
}

// Confirma exclusão de uma carta só (quando clica no botão ❌)
async function confirmarExcluirCarta(cartaId) {
  try {
    const res = await fetch(`/api/carta/${cartaId}`);
    if (!res.ok) throw new Error('Erro ao buscar carta');

    const carta = await res.json();

    if (carta.favorita === 1) {
      // Carta favorita não pode ser excluída
      showPopup('Essa carta está marcada como favorita e não pode ser excluída.', false);
      return;
    }

    // Confirma exclusão com popup
    showPopup('Quer mesmo excluir essa carta?', true, () => excluirCarta(cartaId));
  } catch (e) {
    console.error('Erro ao verificar carta favorita:', e);
    alert('Erro ao verificar carta favorita');
  }
}

// Exclui a carta específica
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

// Vai pra página de edição da carta
function editarCarta(cartaId) {
  window.location.href = `editar.html?id=${cartaId}`;
}

// Aplica filtro de busca nas cartas mostrando só as que batem com o texto digitado
function aplicarFiltroCartas() {
  const filtro = buscaInput?.value?.toLowerCase() || '';
  const cartas = document.querySelectorAll('#cartas-container > div.carta-box');
  cartas.forEach(carta => {
    const textoCarta = carta.textContent.toLowerCase();
    carta.classList.toggle('hidden', !textoCarta.includes(filtro));
  });
}

// Pega input da busca e adiciona evento para filtrar enquanto digita
const buscaInput = document.getElementById('busca');
if (buscaInput) {
  buscaInput.addEventListener('input', aplicarFiltroCartas);
}

// Abre modal pra mostrar arte da carta maior
function expandirArte(src) {
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.classList.add('show');
}

// Fecha modal da arte expandida
function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.classList.remove('show');
  modal.addEventListener('transitionend', () => {
    if (!modal.classList.contains('show')) {
      document.getElementById('img-arte-expandida').src = '';
    }
  }, { once: true });
}

// Popup customizado com mensagem, botão ok, e opcional botão cancelar
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

// Quando clica no link sair, mostra popup confirmando saída
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

// Alterna o status de favorita (liga/desliga) da carta, chama API e atualiza botão
async function toggleFavorita(cartaId, atualFavorita) {
  const novaFavorita = atualFavorita == 1 ? 0 : 1;

  try {
    const res = await fetch(`/api/cartas/${cartaId}/favorita`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, favorita: novaFavorita })
    });
    if (!res.ok) throw new Error('Falha ao atualizar favorita');

    // Atualiza só o botão da carta no DOM sem recarregar tudo
    atualizarCartaFavoritaNoDOM(cartaId, novaFavorita);

  } catch (e) {
    console.error('Erro ao atualizar favorita:', e);
    alert('Erro ao atualizar carta favorita');
  }
}

// Atualiza o botão estrela da carta no DOM sem recarregar a lista toda
function atualizarCartaFavoritaNoDOM(cartaId, novaFavorita) {
  const container = document.getElementById('cartas-container');
  const checkbox = container.querySelector(`.delete-checkbox[data-carta-id="${cartaId}"]`);
  if (!checkbox) return;

  const cardDiv = checkbox.closest('.carta-box');
  if (!cardDiv) return;

  const btnFavorita = cardDiv.querySelector('.img-wrapper > button');
  if (!btnFavorita) return;

  btnFavorita.textContent = novaFavorita === 1 ? '⭐' : '☆';
  btnFavorita.setAttribute('onclick', `toggleFavorita(${cartaId}, ${novaFavorita})`);
}

// Anima as cartas aparecendo com fade e deslizando pra cima
function animarCartas() {
  const cartas = document.querySelectorAll('#cartas-container .carta-box');
  cartas.forEach((carta) => {
    carta.style.opacity = 0;
    carta.style.animation = `fadeSlideIn 0.6s ease forwards`;
  });
}

// Fecha modal ao clicar fora da imagem (clicar no fundo)
const modal = document.getElementById('modal-arte-expandida');
modal.addEventListener('click', e => {
  if (e.target === modal) {
    fecharModalArte();
  }
});