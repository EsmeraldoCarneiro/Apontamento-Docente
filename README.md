# 🍎 Diário de Classe Digital

Sistema de gestão escolar focado no controle de frequência, lançamento de notas e acompanhamento pedagógico. Desenvolvido para facilitar a rotina docente com cálculos automáticos e interface responsiva.

## 🚀 Funcionalidades

### 📋 Gestão de Turmas

  * Cadastro de turmas com identificação única por **Nome, Matéria e Turno**.
  * Gerenciamento de lista de alunos por turma.
  * Definição de dias letivos para cálculo de frequência.

### ✍️ Chamada Digital

  * Registro de presença simplificado.
  * Histórico de chamadas salvo por data no Firestore.
  * Campo para anotação do conteúdo lecionado no dia.

### 📊 Gestor de Notas (Inteligente)

  * **Divisão por Semestres:** Lançamentos separados para o 1º e 2º semestre.
  * **Configuração de Pesos:** Definição dinâmica da quantidade de avaliações e seus respectivos pesos (Soma 10).
  * **Cálculo de Média SEDUC:** Substituição automática da menor nota pela nota de Recuperação (REC), caso seja maior.
  * **Trava de Segurança:** O campo de REC só é habilitado se o aluno realmente estiver com média parcial abaixo de 6.0.
  * **Situação em Tempo Real:** Status automático de **Aprovado**, **Reprovado**, **Rec. Obrigatória** ou **Retido por Falta**.
  * **Controle de Faltas:** Exibição de quantas faltas o aluno ainda pode ter para manter o mínimo de **75% de presença**.

### 📱 Interface Adaptativa

  * Visual moderno com tema Dark nos inputs.
  * Layout em **Cards** para dispositivos móveis, eliminando a necessidade de barra de rolagem horizontal.

## 🛠️ Tecnologias Utilizadas

  * **ReactJS**: Biblioteca principal para a interface.
  * **Vite**: Ferramenta de build rápida.
  * **Firebase Firestore**: Banco de dados NoSQL em tempo real.
  * **Firebase Authentication**: Gestão de acesso dos docentes.

## 📦 Como rodar o projeto

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/seu-usuario/diario-classe.git
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Configure o Firebase:**
    Crie um arquivo `src/firebase.js` e adicione suas credenciais:

    ```javascript
    const firebaseConfig = {
      apiKey: "SUA_API_KEY",
      authDomain: "SEU_AUTH_DOMAIN",
      projectId: "SEU_PROJECT_ID",
      storageBucket: "SEU_STORAGE_BUCKET",
      messagingSenderId: "SEU_SENDER_ID",
      appId: "SEU_APP_ID"
    };
    ```

4.  **Inicie o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](https://www.google.com/search?q=LICENSE) para mais detalhes.

-----

Desenvolvido por [Esmeraldo Junior](https://www.google.com/search?q=https://github.com/seu-usuario)
