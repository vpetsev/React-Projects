// Private API credentials are configured only in the local Node server.
const inputField = document.querySelector('#input');
const shortenButton = document.querySelector('#shorten');
const responseField = document.querySelector('#responseField');

const shortenUrl = async () => {
  try {
    const response = await fetch('/api/shorten', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: inputField.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to shorten the URL.');
    responseField.textContent = `Your shortened URL is: ${data.shortUrl}`;
  } catch (error) {
    responseField.textContent = error.message;
  }
};

shortenButton.addEventListener('click', event => {
  event.preventDefault();
  responseField.textContent = '';
  shortenUrl();
});
