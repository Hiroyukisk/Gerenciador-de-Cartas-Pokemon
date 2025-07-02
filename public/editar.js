// Pega o ID do usuário salvo no localStorage (pra saber quem tá logado)
const usuarioId = localStorage.getItem('usuarioId');

// Se não tiver usuário logado, manda pra página de login
if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  init(); // Se tiver, inicia a página
}

// Função inicial que carrega usuário, sets e carta pra edição
async function init() {
  await buscarUsuario(usuarioId);
  await carregarSets();
  await carregarCartaParaEdicao();
}

// Busca os dados do usuário pelo ID na API e mostra o email no cabeçalho
async function buscarUsuario(id) {
  try {
    const res = await fetch(`/api/usuario/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.email) {
      document.getElementById('nome-usuario').textContent = data.email;
    } else {
      console.error('Erro ao buscar usuário:', data.message || data);
    }
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
  }
}

// Busca os sets/coleções de cartas da API Pokémon e preenche o dropdown de sets
async function carregarSets() {
  try {
    const res = await fetch('https://api.pokemontcg.io/v2/sets');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const selectSet = document.getElementById('set');
    selectSet.innerHTML = '';

    // Placeholder inicial "Selecione o set"
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione o set/coleção';
    placeholder.disabled = true;
    placeholder.selected = true;
    selectSet.appendChild(placeholder);

    // Preenche as opções do select com os sets recebidos
    data.data.forEach(set => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = `${set.name} (${set.id})`;
      selectSet.appendChild(option);
    });
  } catch (err) {
    console.error('Erro ao carregar sets:', err);
    showPopup('Falha ao carregar os sets de cartas. Tente novamente mais tarde.');
  }
}

// Carrega os dados da carta que será editada (pega o id na URL), e preenche o formulário
async function carregarCartaParaEdicao() {
  const urlParams = new URLSearchParams(window.location.search);
  const cartaId = urlParams.get('id');
  if (!cartaId) {
    // Se não tiver ID na URL, mostra popup e redireciona
    showPopup('Nenhuma carta selecionada para edição.', false, () => window.location.href = '/principal.html');
    return;
  }

  try {
    const res = await fetch(`/api/carta/${cartaId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const carta = await res.json();

    if (carta) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa pra garantir render
      // Preenche campos do formulário com dados da carta
      document.getElementById('nome').value = carta.nome || '';
      document.getElementById('numero').value = carta.numero || '';
      document.getElementById('set').value = carta.setId ?? carta.set ?? '';
      document.getElementById('ano').value = carta.ano || '';
      document.getElementById('quantidade').value = carta.quantidade ?? '';
      document.getElementById('info').value = carta.info || '';

      // Preenche multiselects (raridade e tipo) com valores da carta
      if (carta.raridade) confirmarSelecaoEdicao('raridade', carta.raridade);
      if (carta.tipo) confirmarSelecaoEdicao('tipo', carta.tipo);

      // Configura preview da imagem da carta
      const imgPreview = document.getElementById('img-preview');
      const btnExpandir = document.getElementById('btn-expandir');
      const imgSrc = carta.url_imagem || '';

      imgPreview.src = imgSrc;
      if (imgSrc) {
        imgPreview.classList.remove('hidden');
        btnExpandir.classList.remove('hidden');
      } else {
        imgPreview.classList.add('hidden');
        btnExpandir.classList.add('hidden');
      }
    } else {
      showPopup('Carta não encontrada.', false, () => window.location.href = '/principal.html');
    }
  } catch (err) {
    console.error('Erro ao carregar carta para edição:', err);
    showPopup('Erro ao carregar carta. Veja o console.', false, () => window.location.href = '/principal.html');
  }
}

// Salva as alterações feitas na carta (PUT na API)
async function salvarAlteracoes() {
  const urlParams = new URLSearchParams(window.location.search);
  const cartaId = urlParams.get('id');

  // Pega valores selecionados de raridade e tipo
  const raridadeSelecionada = document.getElementById('raridade-button-text').textContent;
  const tipoSelecionado = document.getElementById('tipo-button-text').textContent;

  // Monta o objeto com dados atualizados da carta
  const dadosAtualizados = {
    usuario_id: usuarioId,
    nome: document.getElementById('nome').value.trim(),
    numero: document.getElementById('numero').value.trim(),
    setId: document.getElementById('set').value,
    ano: document.getElementById('ano').value.trim(),
    quantidade: document.getElementById('quantidade').value.trim(),
    raridade: raridadeSelecionada !== 'Raridade' ? raridadeSelecionada : '',
    idioma: document.getElementById('idioma').value,
    tipo: tipoSelecionado !== 'Tipo da carta' ? tipoSelecionado : '',
    info: document.getElementById('info').value.trim(),
    url_imagem: document.getElementById('img-preview').src
  };

  // Validação básica dos campos obrigatórios
  if (!dadosAtualizados.nome || !dadosAtualizados.numero || !dadosAtualizados.setId || dadosAtualizados.quantidade === '') {
    showPopup('Preencha os campos obrigatórios: Nome, Número, Set e Quantidade.');
    return;
  }

  // Verifica se quantidade é número >= 0
  if (isNaN(dadosAtualizados.quantidade) || Number(dadosAtualizados.quantidade) < 0) {
    showPopup('Quantidade deve ser um número maior ou igual a zero.');
    return;
  }

  try {
    // Faz requisição PUT para atualizar a carta
    const res = await fetch(`/api/cartas/${cartaId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dadosAtualizados)
    });
    const data = await res.json();

    if (data.success) {
      // Sucesso na atualização, mostra popup e redireciona pro principal
      showPopup('Carta atualizada com sucesso!', false, () => window.location.href = '/principal.html');
    } else {
      showPopup('Erro ao atualizar carta.');
      console.error(data);
    }
  } catch (err) {
    console.error('Erro ao atualizar carta:', err);
    showPopup('Erro inesperado ao atualizar carta.');
  }
}

// Cancela a edição da carta, perguntando antes se quer mesmo cancelar
function cancelarEdicao() {
  showPopup('Deseja cancelar a edição? As alterações não serão salvas.', true, () => {
    window.location.href = '/principal.html';
  });
}

// Expande a imagem da carta num modal maior, só se tiver uma imagem válida
function expandirArte(src) {
  if (!src || src.includes('pokeball.png')) {
    showPopup('Nenhuma imagem para expandir.');
    return;
  }
  const modal = document.getElementById('modal-arte-expandida');
  const img = document.getElementById('img-arte-expandida');
  img.src = src;
  modal.style.display = 'flex';
}

// Fecha o modal da arte expandida e limpa a imagem
function fecharModalArte() {
  const modal = document.getElementById('modal-arte-expandida');
  modal.style.display = 'none';
  document.getElementById('img-arte-expandida').src = '';
}

// Mostra um popup customizado, com opção de cancelar ou só OK
// onConfirm e onCancel são callbacks para os botões
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

// Função que mostra ou esconde dropdown do multiselect (raridade ou tipo)
function toggleDropdown(campo) {
  const dropdown = document.getElementById(`${campo}-dropdown`);
  dropdown.classList.toggle('hidden');
}

// Confirma seleção dos checkboxes do multiselect e atualiza texto do botão
function confirmarSelecao(campo) {
  const checkboxes = document.querySelectorAll(`#${campo}-dropdown input[type="checkbox"]`);
  const selecionados = [];
  checkboxes.forEach(cb => { if (cb.checked) selecionados.push(cb.value); });
  const texto = selecionados.length ? selecionados.join(', ') : (campo === 'raridade' ? 'Raridade' : 'Tipo da carta');
  document.getElementById(`${campo}-button-text`).textContent = texto;
  toggleDropdown(campo);
}

// Preenche os checkboxes do multiselect com os valores já salvos (na edição)
function confirmarSelecaoEdicao(campo, valores) {
  const valoresArray = valores.split(',').map(v => v.trim());
  const checkboxes = document.querySelectorAll(`#${campo}-dropdown input[type="checkbox"]`);
  checkboxes.forEach(cb => { cb.checked = valoresArray.includes(cb.value); });
  document.getElementById(`${campo}-button-text`).textContent = valores;
}

// Configura o logout pra limpar localStorage e ir pra login, com confirmação no popup
const linkSair = document.querySelector('aside nav a[href="login.html"]');
if (linkSair) {
  linkSair.addEventListener('click', e => {
    e.preventDefault();
    showPopup(
      'Quer mesmo sair?',
      true,
      () => { localStorage.clear(); window.location.href = 'login.html'; },
      () => {}
    );
  });
}