// Toggle entre os formulários login, cadastro e alterar senha
const btnLogin = document.getElementById('btn-login');
const btnCadastro = document.getElementById('btn-cadastro');
const btnAlterarSenha = document.getElementById('btn-alterar-senha');

const formLogin = document.getElementById('form-login');
const formCadastro = document.getElementById('form-cadastro');
const formAlterarSenha = document.getElementById('form-alterar-senha');

function resetForms() {
  formLogin.classList.add('hidden');
  formCadastro.classList.add('hidden');
  formAlterarSenha.classList.add('hidden');

  btnLogin.classList.remove('font-bold', 'border-b-4', 'border-blue-600');
  btnCadastro.classList.remove('font-bold', 'border-b-4', 'border-blue-600');
  btnAlterarSenha.classList.remove('font-bold', 'border-b-4', 'border-blue-600');
}

btnLogin.addEventListener('click', () => {
  resetForms();
  formLogin.classList.remove('hidden');
  btnLogin.classList.add('font-bold', 'border-b-4', 'border-blue-600');
});

btnCadastro.addEventListener('click', () => {
  resetForms();
  formCadastro.classList.remove('hidden');
  btnCadastro.classList.add('font-bold', 'border-b-4', 'border-blue-600');
});

btnAlterarSenha.addEventListener('click', () => {
  resetForms();
  formAlterarSenha.classList.remove('hidden');
  btnAlterarSenha.classList.add('font-bold', 'border-b-4', 'border-blue-600');
});

// Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailLogin').value.trim();
  const senha = document.getElementById('senhaLogin').value.trim();

  if (!email || !senha) {
    showPopup('Preencha email e senha.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || 'Erro ao fazer login.');
      return;
    }

    if (data.usuarioId) {
      localStorage.setItem('usuarioId', data.usuarioId);
      window.location.href = 'principal.html';
    } else {
      showPopup(data.message || 'Falha ao fazer login.');
    }
  } catch (err) {
    console.error('Erro ao tentar login:', err);
    showPopup('Erro inesperado ao tentar login.');
  }
});

// Cadastro
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nomeCadastro').value.trim();
  const sobrenome = document.getElementById('sobrenomeCadastro').value.trim();
  const dataNascimento = document.getElementById('dataNascimentoCadastro').value;
  const email = document.getElementById('emailCadastro').value.trim();
  const emailConfirmacao = document.getElementById('emailConfirmacaoCadastro').value.trim();
  const senha = document.getElementById('senhaCadastro').value.trim();
  const senhaConfirmacao = document.getElementById('senhaConfirmacaoCadastro').value.trim();

  if (!nome || !sobrenome || !dataNascimento || !email || !emailConfirmacao || !senha || !senhaConfirmacao) {
    showPopup('Preencha todos os campos.');
    return;
  }

  if (email !== emailConfirmacao) {
    showPopup('Os emails não conferem.');
    return;
  }

  if (senha !== senhaConfirmacao) {
    showPopup('As senhas não conferem.');
    return;
  }

  if (senha.length < 6) {
    showPopup('A senha deve ter no mínimo 6 caracteres.');
    return;
  }

  try {
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        sobrenome,
        data_nascimento: dataNascimento,
        email,
        email_confirmacao: emailConfirmacao,
        senha,
        senha_confirmacao: senhaConfirmacao,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || 'Erro ao cadastrar.');
      return;
    }

    showPopup(data.message || 'Cadastro realizado com sucesso! Você já pode logar.', false, () => {
      btnLogin.click();
      formCadastro.reset();
    });
  } catch (err) {
    console.error('Erro ao tentar cadastro:', err);
    showPopup('Erro inesperado ao tentar cadastro.');
  }
});

// Alterar senha
formAlterarSenha.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuarioId = localStorage.getItem('usuarioId');
  if (!usuarioId) {
    showPopup('Usuário não está logado.');
    return;
  }

  const senhaAtual = document.getElementById('senhaAtualAlterar').value.trim();
  const novaSenha = document.getElementById('novaSenhaAlterar').value.trim();
  const novaSenhaConfirmacao = document.getElementById('novaSenhaConfirmacaoAlterar').value.trim();

  if (!senhaAtual || !novaSenha || !novaSenhaConfirmacao) {
    showPopup('Preencha todos os campos.');
    return;
  }

  if (novaSenha !== novaSenhaConfirmacao) {
    showPopup('A nova senha e a confirmação não conferem.');
    return;
  }

  if (novaSenha.length < 6) {
    showPopup('A nova senha deve ter no mínimo 6 caracteres.');
    return;
  }

  try {
    const res = await fetch('/api/alterar-senha', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: usuarioId,
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        nova_senha_confirmacao: novaSenhaConfirmacao,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || 'Erro ao alterar a senha.');
      return;
    }

    showPopup(data.message || 'Senha alterada com sucesso!', false, () => {
      formAlterarSenha.reset();
      btnLogin.click();
    });
  } catch (err) {
    console.error('Erro ao tentar alterar a senha:', err);
    showPopup('Erro inesperado ao tentar alterar a senha.');
  }
});

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
