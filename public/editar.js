const usuarioId = localStorage.getItem('usuarioId');

if (!usuarioId) {
  window.location.href = '/login.html';
} else {
  init();
}

async function init() {
  await buscarUsuario(usuarioId);
  await carregarSets();
  await carregarCartaParaEdicao();
}

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

async function carregarSets() {
  try {
    const res = await fetch('https://api.pokemontcg.io/v2/sets');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
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
    console.error('Erro ao carregar sets:', err);
    showPopup('Falha ao carregar os sets de cartas. Tente novamente mais tarde.');
  }
}

async function carregarCartaParaEdicao() {
  const urlParams = new URLSearchParams(window.location.search);
  const cartaId = urlParams.get('id');
  if (!cartaId) {
    showPopup('Nenhuma carta selecionada para edição.', false, () => window.location.href = '/principal.html');
    return;
  }

  try {
    const res = await fetch(`/api/carta/${cartaId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const carta = await res.json();

    if (carta) {
      await new Promise(resolve => setTimeout(resolve, 100));
      document.getElementById('nome').value = carta.nome || '';
      document.getElementById('numero').value = carta.numero || '';
      document.getElementById('set').value = carta.setId ?? carta.set ?? '';
      document.getElementById('ano').value = carta.ano || '';
      document.getElementById('quantidade').value = carta.quantidade ?? '';
      document.getElementById('info').value = carta.info || '';

      // Preencher multiselects de raridade e tipo:
      if (carta.raridade) confirmarSelecaoEdicao('raridade', carta.raridade);
      if (carta.tipo) confirmarSelecaoEdicao('tipo', carta.tipo);

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

async function salvarAlteracoes() {
  const urlParams = new URLSearchParams(window.location.search);
  const cartaId = urlParams.get('id');

  const raridadeSelecionada = document.getElementById('raridade-button-text').textContent;
  const tipoSelecionado = document.getElementById('tipo-button-text').textContent;

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

  if (!dadosAtualizados.nome || !dadosAtualizados.numero || !dadosAtualizados.setId || dadosAtualizados.quantidade === '') {
    showPopup('Preencha os campos obrigatórios: Nome, Número, Set e Quantidade.');
    return;
  }

  if (isNaN(dadosAtualizados.quantidade) || Number(dadosAtualizados.quantidade) < 0) {
    showPopup('Quantidade deve ser um número maior ou igual a zero.');
    return;
  }

  try {
    const res = await fetch(`/api/cartas/${cartaId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dadosAtualizados)
    });
    const data = await res.json();

    if (data.success) {
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

function cancelarEdicao() {
  showPopup('Deseja cancelar a edição? As alterações não serão salvas.', true, () => {
    window.location.href = '/principal.html';
  });
}

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

// Multiselects:
function toggleDropdown(campo) {
  const dropdown = document.getElementById(`${campo}-dropdown`);
  dropdown.classList.toggle('hidden');
}

function confirmarSelecao(campo) {
  const checkboxes = document.querySelectorAll(`#${campo}-dropdown input[type="checkbox"]`);
  const selecionados = [];
  checkboxes.forEach(cb => { if (cb.checked) selecionados.push(cb.value); });
  const texto = selecionados.length ? selecionados.join(', ') : (campo === 'raridade' ? 'Raridade' : 'Tipo da carta');
  document.getElementById(`${campo}-button-text`).textContent = texto;
  toggleDropdown(campo);
}

function confirmarSelecaoEdicao(campo, valores) {
  const valoresArray = valores.split(',').map(v => v.trim());
  const checkboxes = document.querySelectorAll(`#${campo}-dropdown input[type="checkbox"]`);
  checkboxes.forEach(cb => { cb.checked = valoresArray.includes(cb.value); });
  document.getElementById(`${campo}-button-text`).textContent = valores;
}

// Logout:
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
