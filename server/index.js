const express = require('express');
const app = express();
const cors = require('cors');
const port = 3042;
const secp = require('@noble/secp256k1');
const SHA256 = require('crypto-js/sha256');

// localhost can have cross origin errors
// depending on the browser you use!
app.use(cors());
app.use(express.json());

const generateOneAddressPair = () => {
  const privateKey = Buffer.from(secp.utils.randomPrivateKey()).toString('hex');
  const publicKey = Buffer.from(secp.getPublicKey(privateKey)).toString('hex');
  const publicAddress = '0x' + publicKey.slice(publicKey.length - 40);
  return { privateKey, publicAddress };
};

const generateAddresses = nb => {
  const addresses = [];
  for (let i = 0; i < nb; i++) {
    const newAddress = generateOneAddressPair();
    addresses.push(newAddress);
  }

  return addresses;
};

const addresses = generateAddresses(3);

const balances = {
  [addresses[0].publicAddress]: 100,
  [addresses[1].publicAddress]: 50,
  [addresses[2].publicAddress]: 75
};

app.get('/balance/:address', (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post('/send', (req, res) => {
  const { message, signature, publicKey } = req.body;
  const msgHash = SHA256(JSON.stringify(message)).toString();
  if (secp.verify(signature, msgHash, publicKey)) {
    const { amount, recipient } = message;
    const sender = '0x' + publicKey.slice(publicKey.length - 40);
    if (!balances[sender]) {
      res.send({ error: 'Sender not found' });
      return;
    }
    if (balances[sender] >= amount) {
      balances[sender] -= amount;
      balances[recipient] = (balances[recipient] || 0) + +amount;
      res.send({ balance: balances[sender], publicAddress: sender });
      console.log(`From : ${sender} to : ${recipient} amount : ${amount}ETH`);
    } else {
      res.send({ error: 'Not enough funds' });
    }
  } else {
    res.send({ error: 'Invalid signature' });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
  console.log('   ');
  console.log('Available Accounts');
  console.log('==========================');
  Object.keys(balances).forEach((publicAddress, index) => {
    console.log(`(${index}) ${publicAddress} (${balances[publicAddress]}ETH)`);
  });
  console.log('   ');
  console.log('Private Keys');
  console.log('==========================');
  addresses.forEach((address, index) => {
    console.log(`(${index}) ${address.privateKey}`);
  });
});
