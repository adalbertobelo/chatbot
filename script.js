import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const newChatButton = document.getElementById('new-chat-button');
const audioButton = document.getElementById('audio-button');

// --- IMPORTANT ---
// Substitua 'YOUR_API_KEY' pela sua chave de API do Google AI Studio.
// NÃO COMPARTILHE ESTA CHAVE PUBLICAMENTE EM REPOSITÓRIOS GIT.
// Para um projeto real, esta chave deveria ser gerenciada por um backend.
const API_KEY = 'AIzaSyBdJAeX0TyqKXTRaPsC4Taat2d06042kQY';
// --- /IMPORTANT ---

if (!chatMessages || !messageInput || !sendButton) {
    console.error("Elementos do DOM não encontrados. Verifique o HTML.");
} else if (API_KEY === 'YOUR_API_KEY') {
    addMessageToChat("Por favor, configure sua API Key do Google AI no arquivo script.js para usar o chat.", 'ai', true);
    messageInput.disabled = true;
    sendButton.disabled = true;
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Using gemini-1.5-flash as it's fast and capable

// Configuration for the generation
const generationConfig = {
    temperature: 0.7, // Controls randomness: lower for more deterministic, higher for more creative
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192, // Max length of the response
    responseMimeType: "text/plain", // Expect plain text response
};

// Safety settings to block harmful content
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

let chatSession;

async function initializeChat() {
    if (API_KEY === 'YOUR_API_KEY') return;
   /* try {
        chatSession = model.startChat({
            generationConfig,
            safetySettings,
            history: [
              { role: "user", parts: [{ text: "Responda sempre no idioma do input, de forma informal, engraçada e com um toque de sarcasmo em todas as respostas." }] }],

        });*/
        addMessageToChat("E ae! Fala comigo...", 'ai');
    } catch (error) {
        console.error("Erro ao inicializar o chat:", error);
        addMessageToChat("Erro ao conectar com a IA. Verifique sua API Key e a consola para mais detalhes.", 'ai', true);
        messageInput.disabled = true;
        sendButton.disabled = true;
    }
}

function addMessageToChat(text, sender, isError = false) {
    if (!chatMessages) return;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    if (isError) {
        messageElement.style.backgroundColor = '#ffdddd';
        messageElement.style.color = '#d8000c';
    }
    // Basic sanitization to prevent HTML injection
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    messageElement.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}

async function sendMessage() {
    if (!messageInput || !sendButton) return;
    const messageText = messageInput.value.trim();
    if (!messageText) return;
    if (API_KEY === 'YOUR_API_KEY') {
        addMessageToChat("Configure sua API Key para enviar mensagens.", 'ai', true);
        return;
    }
    if (!chatSession) {
        addMessageToChat("A sessão de chat não foi inicializada. Verifique sua API Key.", 'ai', true);
        return;
    }

    addMessageToChat(messageText, 'user');
    messageInput.value = '';
    sendButton.disabled = true;
    messageInput.disabled = true;

    const loadingMessage = addMessageToChat("Pensando...", 'ai');
    loadingMessage.classList.add('loading');

    try {
        const prompt = `Responda em português do Brasil, acompanhando o tom e o humor da mensagem abaixo. Se for formal, responda formal. Se for informal ou sarcástico, responda igual. Mensagem do usuário: "${messageText}"`;
        const result = await chatSession.sendMessage(prompt);
        const response = result.response;
        const aiText = await response.text();
        chatMessages.removeChild(loadingMessage);
        addMessageToChat(aiText, 'ai');

    } catch (error) {
        console.error("Erro ao enviar mensagem para IA:", error);
        chatMessages.removeChild(loadingMessage);
        let errorMessage = "Ocorreu um erro ao processar sua mensagem.";
        if (error.message && error.message.includes("API key not valid")) {
            errorMessage = "Sua API Key não é válida. Verifique se ela foi copiada corretamente.";
        } else if (error.message && error.message.includes("quota")) {
            errorMessage = "Você excedeu sua cota de API. Tente novamente mais tarde.";
        }
        addMessageToChat(errorMessage, 'ai', true);
    } finally {
        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Enviar mensagem com Enter ou botão
if (sendButton && messageInput) {
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Novo Chat: limpa o histórico e reinicia a sessão
if (newChatButton) {
    newChatButton.addEventListener('click', async () => {
        // Salva o histórico atual antes de limpar
        if (chatMessages) {
            const messages = Array.from(chatMessages.children).map(div => ({
                text: div.innerText,
                sender: div.classList.contains('user-message') ? 'user' : 'ai',
                isError: div.style.backgroundColor === 'rgb(255, 221, 221)'
            }));
            if (messages.length > 0) {
                const history = loadChatHistory();
                history.push({ title: `Chat ${history.length + 1}`, messages });
                saveChatHistory(history);
            }
        }
        // Limpa e reinicia
        if (chatMessages) chatMessages.innerHTML = '';
        await initializeChat();
        messageInput.value = '';
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    });
}

// Sidebar (Histórico do Chat)
const hamburgerMenu = document.getElementById('hamburger-menu');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const chatHistoryList = document.getElementById('chat-history-list');
const deleteHistoryButton = document.getElementById('delete-history-button');

// Função para salvar e carregar histórico do chat no localStorage
function saveChatHistory(history) {
    localStorage.setItem('chatHistory', JSON.stringify(history));
}
function loadChatHistory() {
    return JSON.parse(localStorage.getItem('chatHistory') || '[]');
}
function renderChatHistory() {
    const history = loadChatHistory();
    chatHistoryList.innerHTML = '';
    history.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = item.title || `Chat ${idx + 1}`;
        li.addEventListener('click', () => {
            // Carregar mensagens do histórico (exemplo: sobrescreve o chat atual)
            if (window.confirm('Carregar este histórico? Isso substituirá o chat atual.')) {
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                    item.messages.forEach(msg => {
                        addMessageToChat(msg.text, msg.sender, msg.isError);
                    });
                }
            }
            sidebar.style.display = 'none';
        });
        chatHistoryList.appendChild(li);
    });
}

// Abrir/fechar sidebar
if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', () => {
        sidebar.style.display = 'flex';
        renderChatHistory();
    });
}
if (closeSidebar) {
    closeSidebar.addEventListener('click', () => {
        sidebar.style.display = 'none';
    });
}

// Deletar histórico
if (deleteHistoryButton) {
    deleteHistoryButton.addEventListener('click', () => {
        if (window.confirm('Tem certeza que deseja apagar todo o histórico?')) {
            localStorage.removeItem('chatHistory');
            renderChatHistory();
        }
    });
}

// Enviar Áudio: reconhecimento de voz
let recognition;
if (audioButton && 'webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    audioButton.addEventListener('click', () => {
        recognition.start();
        audioButton.disabled = true;
        audioButton.textContent = "🎤 Gravando...";
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        messageInput.focus();
        audioButton.disabled = false;
        audioButton.textContent = "🎤 Enviar Áudio";
    };

    recognition.onerror = () => {
        audioButton.disabled = false;
        audioButton.textContent = "🎤 Enviar Áudio";
        alert("Não foi possível capturar o áudio. Tente novamente.");
    };

    recognition.onend = () => {
        audioButton.disabled = false;
        audioButton.textContent = "🎤 Enviar Áudio";
    };
} else if (audioButton) {
    audioButton.disabled = true;
    audioButton.title = "Seu navegador não suporta reconhecimento de voz";
}

// Inicializa o chat ao carregar a página
initializeChat();
