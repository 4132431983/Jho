import Web3 from 'web3';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Initialize Web3 with Alchemy
const alchemyProvider = https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY};
const web3 = new Web3(new Web3.providers.HttpProvider(alchemyProvider));

// Load sensitive data from environment variables
const privateKey = process.env.PRIVATE_KEY;
const senderAccount = web3.eth.accounts.privateKeyToAccount(privateKey).address;
const receiverAddress = process.env.RECEIVER_ADDRESS;

// TextLocal API Configuration
const textLocalApiKey = process.env.TEXTLOCAL_API_KEY;
const userPhoneNumber = process.env.USER_PHONE_NUMBER;

// Function to send SMS via TextLocal
async function sendSms(message) {
  try {
    const response = await axios.post('https://api.txtlocal.com/send/', null, {
      params: {
        apiKey: textLocalApiKey,
        numbers: userPhoneNumber,
        message: message,
        sender: 'ETHBot', // Custom sender name (must be configured in TextLocal account)
      },
    });

    if (response.data.status === 'success') {
      console.log('SMS notification sent successfully.');
    } else {
      console.error('Failed to send SMS:', response.data.errors);
    }
  } catch (error) {
    console.error('Error sending SMS:', error.message);
  }
}

// Function to sweep the ETH balance
async function sweepEth() {
  try {
    // Fetch ETH balance
    const balanceWei = await web3.eth.getBalance(senderAccount);
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
    console.log(`Current ETH Balance: ${balanceEth} ETH`);

    if (balanceEth > 0.01) {
      // Calculate gas price and estimate gas
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = 21000; // Standard gas limit for ETH transfer
      const gasCostWei = BigInt(gasPrice) * BigInt(gasLimit);

      // Calculate the amount to send (balance - gas fees)
      const sendAmountWei = BigInt(balanceWei) - gasCostWei;

      if (sendAmountWei > 0) {
        const tx = {
          from: senderAccount,
          to: receiverAddress,
          value: sendAmountWei.toString(),
          gas: gasLimit,
          gasPrice,
        };

        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log(`Transaction successful: ${receipt.transactionHash}`);

        // Send SMS notification
        const smsMessage = `Transaction successful!\nAmount: ${web3.utils.fromWei(
          sendAmountWei.toString(),
          'ether'
        )} ETH\nTX Hash: ${receipt.transactionHash}`;
        await sendSms(smsMessage);
      } else {
        console.log('Not enough balance after gas fees.');
      }
    } else {
      console.log('Balance too low to sweep.');
    }
  } catch (error) {
    console.error('Error during sweeping:', error.message);
  }
}

// Main function
async function main() {
  console.log('Starting ETH Sweeper Bot...');
  try {
    await sweepEth();
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

main();