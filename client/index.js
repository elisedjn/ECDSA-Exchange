import './index.scss';
import SHA256 from 'crypto-js/sha256';
import * as secp from '@noble/secp256k1';

const server = 'http://localhost:3042';

const fetchBalance = address => {
  if (address === '') {
    document.getElementById('balance').innerHTML = 0;
    return;
  }

  fetch(`${server}/balance/${address}`)
    .then(response => {
      return response.json();
    })
    .then(({ balance }) => {
      document.getElementById('balance').innerHTML = balance;
    });
};

const hasErrors = (privateKey, amount, recipient) => {
  const errorMessage = document.getElementById('error-message');

  if (privateKey.length !== 64) {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = 'ERROR : Invalid private key';
    return true;
  }
  if (!amount) {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = 'ERROR : Please select an amount to transfer';
    return true;
  }
  if (!recipient) {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML =
      'ERROR : Please enter a recipient for this transfer';
    return true;
  }

  errorMessage.style.display = 'none';
  errorMessage.innerHTML = '';
  return false;
};

const handleSuccess = (balance, publicAddress, amount, recipient) => {
  document.getElementById('balance').innerHTML = balance;
  document.getElementById('exchange-address').value = publicAddress;
  document.getElementById('recipient').value = '';
  document.getElementById('transfer-amount').value = null;
  document.getElementById('success-message').style.display = 'block';
  document.getElementById('success-amount').innerHTML = amount;
  document.getElementById('success-recipient').innerHTML = recipient;
};

document
  .getElementById('exchange-address')
  .addEventListener('input', ({ target: { value } }) => {
    fetchBalance(value);
  });

document
  .getElementById('private-key')
  .addEventListener('input', ({ target: { value } }) => {
    if (value.length === 64) {
      const errorMessage = document.getElementById('error-message');
      errorMessage.style.display = 'none';
      errorMessage.innerHTML = '';
      const privateKey = value.toLowerCase();
      const publicKey = Buffer.from(secp.getPublicKey(privateKey)).toString(
        'hex'
      );
      const publicAddress = '0x' + publicKey.slice(publicKey.length - 40);

      document.getElementById('public-address-wrapper').style.display = 'block';
      document.getElementById('public-address').innerHTML = publicAddress;
      document.getElementById('exchange-address').value = publicAddress;
      fetchBalance(publicAddress);
    } else {
      document.getElementById('public-address-wrapper').style.display = 'none';
      document.getElementById('public-address').innerHTML = '';
    }
  });

document
  .getElementById('transfer-amount')
  .addEventListener('click', async () => {
    const amount = document.getElementById('send-amount')?.value;
    const recipient = document
      .getElementById('recipient')
      ?.value?.toLowerCase();
    const privateKey = document
      .getElementById('private-key')
      ?.value?.toLowerCase();

    if (hasErrors(privateKey, amount, recipient)) {
      return;
    }

    const message = {
      amount,
      recipient
    };

    const msgHash = SHA256(JSON.stringify(message));

    const signature = Buffer.from(
      await secp.sign(msgHash.toString(), privateKey)
    ).toString('hex');

    const publicKey = Buffer.from(secp.getPublicKey(privateKey)).toString(
      'hex'
    );

    const body = JSON.stringify({ signature, message, publicKey });

    const request = new Request(`${server}/send`, { method: 'POST', body });

    fetch(request, { headers: { 'Content-Type': 'application/json' } })
      .then(response => {
        return response.json();
      })
      .then(({ balance, publicAddress, error }) => {
        if (error) {
          const errorMessage = document.getElementById('error-message');
          errorMessage.style.display = 'block';
          errorMessage.innerHTML = 'ERROR : ' + error;
        } else {
          handleSuccess(balance, publicAddress, amount, recipient);
        }
      });
  });
