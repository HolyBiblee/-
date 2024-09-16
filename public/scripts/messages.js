document.addEventListener('DOMContentLoaded', () => {
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages');
  
    // Данные сообщений для демонстрации
    const messages = [
      { sender: 'User1', content: 'Привет!' },
      { sender: 'User2', content: 'Привет! Как дела?' },
      { sender: 'User1', content: 'Хорошо, спасибо. А у тебя?' },
    ];
  
    // Функция для отображения сообщений
    const displayMessages = () => {
      messagesContainer.innerHTML = messages.map(msg => `
        <div class="message">
          <p><strong>${msg.sender}:</strong> ${msg.content}</p>
        </div>
      `).join('');
    };
  
    // Загрузка сообщений при загрузке страницы
    displayMessages();
  
    // Отправка сообщения
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
  
      const newMessage = messageInput.value;
      messages.push({ sender: 'User1', content: newMessage }); // Добавление сообщения в массив
  
      messageInput.value = '';
      displayMessages(); // Обновление списка сообщений
    });
  });
  