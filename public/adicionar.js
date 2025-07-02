// Pega o ID do usuário salvo no localStorage
const usuarioId = localStorage.getItem('usuarioId');

// Se não tiver usuário logado, manda pra página de login
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  initPage(); // Se tiver, inicia a página
}

// Função que inicializa tudo ao carregar a página
async function initPage() {
  await buscarUsuario(usuarioId); // Pega dados do usuário e mostra na página
  await carregarSets();            // Carrega os sets/coleções no select
  await atualizarContador();       // Atualiza contador de cartas do usuário
  registrarEventos();              // Registra eventos dos botões e inputs
}

// Função genérica pra fazer fetch e já converter pra JSON com tratamento de erro
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Erro ao fazer fetch em ${url}:`, err);
    throw err;
  }
}

// Busca os dados do usuário pela API e coloca o email na tela
async function buscarUsuario(id) {
  try {
    const data = await fetchJson(`/api/usuario/${id}`);
    if (data.email) {
      document.getElementById('nome-usuario').textContent = data.email;
    } else {
      console.error('Erro ao buscar usuário:', data.message);
    }
  } catch (err) {}
}

// Puxa da API os sets/coleções de cartas e popula o dropdown de seleção
async function carregarSets() {
  try {
    const data = await fetchJson('https://api.pokemontcg.io/v2/sets');
    const selectSet = document.getElementById('set');
    selectSet.innerHTML = ''; // Limpa opções existentes

    // Opção padrão e desabilitada pra forçar escolha
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione o set/coleção';
    placeholder.disabled = true;
    placeholder.selected = true;
    selectSet.appendChild(placeholder);

    // Cria opção pra cada set da API
    data.data.forEach(set => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = `${set.name} (${set.id})`;
      selectSet.appendChild(option);
    });
  } catch (err) {
    showPopup('Falha ao carregar os sets de cartas. Tente novamente mais tarde.');
  }
}

// Atualiza o contador de cartas normais do usuário (exclui wishlist)
async function atualizarContador() {
  try {
    const data = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=0`);
    document.getElementById('contador-cartas').textContent = data.length || 0;
  } catch {}
}

// Liga os eventos dos botões e inputs da página (click, change, etc)
function registrarEventos() {
  const btnBuscar = document.querySelector('button[title="Buscar carta"]');
  if (document.getElementById('set')) {
    document.getElementById('set').addEventListener('change', buscarCartasPorSet);
  }
  if (btnBuscar) btnBuscar.addEventListener('click', buscarCarta);

  // Dropdown raridade e tipo, botões de confirmação e expandir arte
  const btnRaridade = document.getElementById('btn-raridade');
  const btnTipo = document.getElementById('btn-tipo');
  const confirmarRaridade = document.getElementById('confirmar-raridade');
  const confirmarTipo = document.getElementById('confirmar-tipo');
  const btnExpandir = document.getElementById('btn-expandir');
  const modalArte = document.getElementById('modal-arte-expandida');

  if (btnRaridade) btnRaridade.addEventListener('click', () => toggleDropdown('raridade'));
  if (btnTipo) btnTipo.addEventListener('click', () => toggleDropdown('tipo'));
  if (confirmarRaridade) confirmarRaridade.addEventListener('click', () => confirmarSelecao('raridade'));
  if (confirmarTipo) confirmarTipo.addEventListener('click', () => confirmarSelecao('tipo'));
  if (btnExpandir) btnExpandir.addEventListener('click', () => expandirArte(document.getElementById('img-preview').src));
  if (modalArte) modalArte.addEventListener('click', fecharModalArte);
}

// Abre ou fecha o dropdown (raridade ou tipo)
function toggleDropdown(tipo) {
  const dropdown = document.getElementById(`${tipo}-dropdown`);
  if (dropdown) dropdown.classList.toggle('hidden');
}

// Confirma seleção no dropdown e atualiza o texto do botão
function confirmarSelecao(tipo) {
  const checkboxes = document.querySelectorAll(`#${tipo}-dropdown input[type=checkbox]`);
  const selecionados = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  document.getElementById(`${tipo}-button-text`).textContent = selecionados.length > 0 ? selecionados.join(', ') : (tipo === 'raridade' ? 'Raridade' : 'Tipo da carta');
  document.getElementById(`${tipo}-dropdown`).classList.add('hidden');
}

// Busca cartas pela API com base no nome digitado no input
async function buscarCarta() {
  const busca = document.getElementById('nome').value.trim();

  if (!busca) {
    showPopup('Digite um termo para buscar.');
    return;
  }

  const query = `name:"${busca}" OR set.name:"${busca}" OR set.releaseDate:"${busca}"`;
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`;

  try {
    const data = await fetchJson(url);

    limparPreview();

    if (data.data && data.data.length > 0) {
      renderizarCartas(data.data);
    } else {
      mostrarMensagemResultado('Nenhuma carta encontrada.');
    }
  } catch {
    showPopup('Erro ao buscar carta. Veja o console.');
  }
}

// Mostra as cartas encontradas em cards clicáveis (preview)
function renderizarCartas(cartas) {
  const container = document.getElementById('resultado-cartas');
  container.innerHTML = '';
  cartas.forEach(carta => {
    const div = document.createElement('div');
    div.className = 'cursor-pointer p-2 bg-white rounded shadow hover:scale-105 transition';
    div.innerHTML = `
      <img src="${carta.images.small}" alt="${carta.name}" class="w-full rounded mb-2" />
      <p class="text-center text-sm font-medium">${carta.name}</p>
    `;
    div.onclick = () => selecionarCarta(carta);
    container.appendChild(div);
  });
}

// Mostra mensagem caso não ache carta ou outra info no resultado
function mostrarMensagemResultado(mensagem) {
  const container = document.getElementById('resultado-cartas');
  container.innerHTML = `<p class="text-center text-gray-500">${mensagem}</p>`;
}

// Limpa o preview da carta, a lista e os botões
function limparPreview() {
  const imgPreview = document.getElementById('img-preview');
  const btnExpandir = document.getElementById('btn-expandir');
  imgPreview.classList.add('hidden');
  imgPreview.src = '';
  btnExpandir.classList.add('hidden');
  document.getElementById('nome-preview').textContent = 'Lista de cartas';
  document.getElementById('resultado-cartas').innerHTML = '';
}

// Quando clica numa carta da lista, preenche o formulário com os dados dela
function selecionarCarta(carta) {
  document.getElementById('nome').value = carta.name;
  document.getElementById('numero').value = carta.number || '';
  document.getElementById('set').value = carta.set?.id || '';
  document.getElementById('ano').value = carta.set?.releaseDate ? new Date(carta.set.releaseDate).getFullYear() : '';
  document.getElementById('quantidade').value = '';
  document.getElementById('info').value = '';
  document.getElementById('raridade-button-text').textContent = 'Raridade';
  document.getElementById('tipo-button-text').textContent = 'Tipo da carta';

  const imgSrc = carta.images.large || carta.images.small || '';
  const imgPreview = document.getElementById('img-preview');
  const btnExpandir = document.getElementById('btn-expandir');

  imgPreview.src = imgSrc;
  if (imgSrc) {
    imgPreview.classList.remove('hidden');
    btnExpandir.classList.remove('hidden');
  } else {
    imgPreview.classList.add('hidden');
    btnExpandir.classList.add('hidden');
  }

  document.getElementById('nome-preview').textContent = 'Preview da carta';
  document.getElementById('resultado-cartas').innerHTML = '';
  document.getElementById('quantidade').focus();
}

// Salva a carta (normal ou wishlist) via API
async function salvarCarta(isWishlist = false) {
  const raridadesSelecionadas = document.getElementById('raridade-button-text').textContent;
  const tiposSelecionados = document.getElementById('tipo-button-text').textContent;

  const dados = {
    usuario_id: usuarioId,
    nome: document.getElementById('nome').value.trim(),
    numero: document.getElementById('numero').value.trim(),
    setId: document.getElementById('set').value,
    ano: document.getElementById('ano').value.trim(),
    quantidade: isWishlist ? 0 : parseInt(document.getElementById('quantidade').value.trim(), 10) || 0,
    raridade: raridadesSelecionadas === 'Raridade' ? '' : raridadesSelecionadas,
    idioma: document.getElementById('idioma').value,
    tipo: tiposSelecionados === 'Tipo da carta' ? '' : tiposSelecionados,
    info: document.getElementById('info').value.trim(),
    url_imagem: document.getElementById('img-preview').src || '',
    wishlist: isWishlist ? 1 : 0
  };

  // Verifica campos obrigatórios antes de enviar
  if (!dados.nome || !dados.numero || !dados.setId) {
    showPopup('Preencha os campos obrigatórios: Nome, Número e Set.');
    return;
  }
  if (!isWishlist && (!dados.quantidade || Number(dados.quantidade) < 1)) {
    showPopup('Quantidade deve ser maior que zero para cartas normais.');
    return;
  }

  // Tenta salvar via POST na API
  try {
    const res = await fetch('/api/cartas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const data = await res.json();

    if (data.success) {
      showPopup('Carta salva com sucesso! Deseja adicionar outra?', true,
        limparFormulario,
        () => window.location.href = '/principal.html'
      );
      atualizarContador();
    } else {
      console.error(data);
      showPopup('Erro ao salvar carta.');
    }
  } catch (err) {
    console.error('Erro ao salvar carta:', err);
    showPopup('Erro inesperado ao salvar carta.');
  }
}

// Limpa o formulário, preview e reset dos dropdowns e focos
function limparFormulario() {
  ['nome', 'numero', 'set', 'ano', 'quantidade', 'info'].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById('img-preview').src = '';
  document.getElementById('img-preview').classList.add('hidden');
  document.getElementById('btn-expandir').classList.add('hidden');
  document.getElementById('raridade-button-text').textContent = 'Raridade';
  document.getElementById('tipo-button-text').textContent = 'Tipo da carta';

  // Limpa checkboxes dos dropdowns
  document.querySelectorAll('#raridade-dropdown input[type=checkbox]').forEach(cb => cb.checked = false);
  document.querySelectorAll('#tipo-dropdown input[type=checkbox]').forEach(cb => cb.checked = false);
  document.getElementById('nome').focus();
}

// Confirma se quer cancelar edição e volta pra página principal
function cancelarEdicao() {
  showPopup('Deseja cancelar a edição? As alterações não serão salvas.', true,
    () => window.location.href = '/principal.html'
  );
}

// Abre modal com a arte da carta em tamanho maior
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

// Fecha o modal da arte expandida
function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.style.display = 'none';
  document.getElementById('img-arte-expandida').src = '';
}

// Mostra popup com mensagem, pode ter botão cancelar, e funções onConfirm/onCancel
function showPopup(message, hasCancel = false, onConfirm = null, onCancel = null) {
  const overlay = document.getElementById('custom-popup-overlay');
  const popupMessage = document.getElementById('custom-popup-message');
  const okButton = document.getElementById('custom-popup-ok');
  const cancelButton = document.getElementById('custom-popup-cancel');

  popupMessage.textContent = message;
  overlay.classList.remove('hidden');
  cancelButton.classList.toggle('hidden', !hasCancel);

  const closePopup = () => overlay.classList.add('hidden');

  okButton.onclick = () => { closePopup(); if (onConfirm) onConfirm(); };
  cancelButton.onclick = () => { closePopup(); if (onCancel) onCancel(); };
}

// Pede confirmação antes de adicionar todas as cartas do set à coleção
async function adicionarSetCompleto() {
  const setId = document.getElementById('set').value;
  if (!setId) {
    showPopup('Selecione um set antes de adicionar.');
    return;
  }

  showPopup(
    'Tem certeza que deseja adicionar todas as cartas desse set à sua coleção?',
    true,
    () => adicionarSet(true), // onConfirm
    () => console.log('Usuário cancelou adicionar set.') // onCancel
  );
}

// Igual o outro, mas para adicionar o set completo na wishlist
async function adicionarSetCompletoWishlist() {
  const setId = document.getElementById('set').value;
  if (!setId) {
    showPopup('Selecione um set antes de adicionar na wishlist.');
    return;
  }

  showPopup(
    'Tem certeza que deseja adicionar o set inteiro na wishlist?',
    true,
    () => adicionarSet(false, true), // onConfirm
    () => console.log('Usuário cancelou adicionar set na wishlist.') // onCancel
  );
}

// Busca cartas do set na API e adiciona todas (com confirmação opcional)
async function adicionarSet(confirmar = true, isWishlist = false) {
  const setId = document.getElementById('set').value;
  if (!setId) {
    showPopup('Selecione um set antes de adicionar todas as cartas.');
    return;
  }

  try {
    const data = await fetchJson(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`);

    if (!data.data || data.data.length === 0) {
      showPopup('Nenhuma carta encontrada para esse set.');
      return;
    }

    if (confirmar) {
      const msg = `Tem certeza que quer adicionar ${data.data.length} cartas do set${isWishlist ? ' na wishlist' : ''}?`;
      showPopup(msg, true, () => salvarCartasDoSet(data.data, isWishlist), () => console.log('Usuário cancelou adição em massa.'));
    } else {
      salvarCartasDoSet(data.data, isWishlist);
    }
  } catch {
    showPopup('Erro ao buscar as cartas do set. Veja o console.');
  }
}

// Salva as cartas do set uma a uma na API, conta sucesso e falhas, mostra resumo
async function salvarCartasDoSet(cartas, isWishlist = false) {
  let sucesso = 0, falha = 0;

  for (const carta of cartas) {
    const dados = {
      usuario_id: usuarioId,
      nome: carta.name,
      numero: carta.number || '',
      setId: carta.set?.id || '',
      ano: carta.set?.releaseDate ? new Date(carta.set.releaseDate).getFullYear() : '',
      quantidade: isWishlist ? 0 : 1,
      raridade: carta.rarity || '',
      idioma: '',
      tipo: '',
      info: '',
      url_imagem: carta.images.large || carta.images.small || '',
      wishlist: isWishlist ? 1 : 0
    };

    try {
      const res = await fetch('/api/cartas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      const result = await res.json();
      if (result.success) sucesso++;
      else {
        falha++;
        console.error('Falha ao salvar carta:', carta.name, result);
      }
    } catch (err) {
      falha++;
      console.error('Erro inesperado ao salvar carta:', carta.name, err);
    }
  }

  showPopup(`Processo finalizado: ${sucesso} cartas ${isWishlist ? 'adicionadas à wishlist' : 'adicionadas'} com sucesso, ${falha} falharam.`);
  atualizarContador();
}

// Busca cartas de um set selecionado e mostra na tela
async function buscarCartasPorSet() {
  const setId = document.getElementById('set').value;
  if (!setId) {
    mostrarMensagemResultado('Selecione um set para ver as cartas.');
    return;
  }

  try {
    const data = await fetchJson(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`);

    if (data.data && data.data.length > 0) {
      renderizarCartas(data.data);
    } else {
      mostrarMensagemResultado('Nenhuma carta encontrada para esse set.');
    }
  } catch {
    showPopup('Erro ao buscar cartas do set. Veja o console.');
  }
}