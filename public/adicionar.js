const usuarioId = localStorage.getItem('usuarioId');

if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  initPage();
}

async function initPage() {
  await buscarUsuario(usuarioId);
  await carregarSets();
  await atualizarContador();
  registrarEventos();
}

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

async function carregarSets() {
  try {
    const data = await fetchJson('https://api.pokemontcg.io/v2/sets');
    const selectSet = document.getElementById('set');
    selectSet.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione o set/coleção';
    placeholder.disabled = true;
    placeholder.selected = true;
    selectSet.appendChild(placeholder);

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

async function atualizarContador() {
  try {
    const data = await fetchJson(`/api/cartas?usuario_id=${usuarioId}&wishlist=0`);
    document.getElementById('contador-cartas').textContent = data.length || 0;
  } catch {}
}


function registrarEventos() {
  const btnBuscar = document.querySelector('button[title="Buscar carta"]');
  if (document.getElementById('set')) {
    document.getElementById('set').addEventListener('change', buscarCartasPorSet);
  }
  if (btnBuscar) btnBuscar.addEventListener('click', buscarCarta);

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

function toggleDropdown(tipo) {
  const dropdown = document.getElementById(`${tipo}-dropdown`);
  if (dropdown) dropdown.classList.toggle('hidden');
}

function confirmarSelecao(tipo) {
  const checkboxes = document.querySelectorAll(`#${tipo}-dropdown input[type=checkbox]`);
  const selecionados = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  document.getElementById(`${tipo}-button-text`).textContent = selecionados.length > 0 ? selecionados.join(', ') : (tipo === 'raridade' ? 'Raridade' : 'Tipo da carta');
  document.getElementById(`${tipo}-dropdown`).classList.add('hidden');
}

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

function mostrarMensagemResultado(mensagem) {
  const container = document.getElementById('resultado-cartas');
  container.innerHTML = `<p class="text-center text-gray-500">${mensagem}</p>`;
}

function limparPreview() {
  const imgPreview = document.getElementById('img-preview');
  const btnExpandir = document.getElementById('btn-expandir');
  imgPreview.classList.add('hidden');
  imgPreview.src = '';
  btnExpandir.classList.add('hidden');
  document.getElementById('nome-preview').textContent = 'Lista de cartas';
  document.getElementById('resultado-cartas').innerHTML = '';
}

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

  if (!dados.nome || !dados.numero || !dados.setId) {
    showPopup('Preencha os campos obrigatórios: Nome, Número e Set.');
    return;
  }
  if (!isWishlist && (!dados.quantidade || Number(dados.quantidade) < 1)) {
    showPopup('Quantidade deve ser maior que zero para cartas normais.');
    return;
  }

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

function adicionarWishlist() {
  salvarCarta(true);
}

function limparFormulario() {
  ['nome', 'numero', 'set', 'ano', 'quantidade', 'info'].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById('img-preview').src = '';
  document.getElementById('img-preview').classList.add('hidden');
  document.getElementById('btn-expandir').classList.add('hidden');
  document.getElementById('raridade-button-text').textContent = 'Raridade';
  document.getElementById('tipo-button-text').textContent = 'Tipo da carta';
  // Limpa checkboxes do dropdown de raridade
  document.querySelectorAll('#raridade-dropdown input[type=checkbox]').forEach(cb => cb.checked = false);
  // Limpa checkboxes do dropdown de tipo
  document.querySelectorAll('#tipo-dropdown input[type=checkbox]').forEach(cb => cb.checked = false);
  document.getElementById('nome').focus();
}


function cancelarEdicao() {
  showPopup('Deseja cancelar a edição? As alterações não serão salvas.', true,
    () => window.location.href = '/principal.html'
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

  okButton.onclick = () => { closePopup(); if (onConfirm) onConfirm(); };
  cancelButton.onclick = () => { closePopup(); if (onCancel) onCancel(); };
}

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