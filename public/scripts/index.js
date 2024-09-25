// Анимация удаления
document.querySelectorAll('.delete-post-button').forEach(button => {
    button.addEventListener('click', (event) => {
      const postElement = event.target.closest('.post');
      
      postElement.style.transition = 'opacity 0.3s ease';
      postElement.style.opacity = '0';
      
      setTimeout(() => {
        postElement.remove();
      }, 300);
    });
  });
  