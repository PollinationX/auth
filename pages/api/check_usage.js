require("dotenv").config()
const jwt = require('jsonwebtoken');
const alchemyKey = process.env.TESTNET_API_URL;
const NFT_COLLECTION_CONTRACT = process.env.NFT_COLLECTION_CONTRACT;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(alchemyKey);
const contractABI = require('../../abi/PX.json');


const handler = async (req, res) => {

    try {
        if (req.method == 'OPTIONS') return res.status(200).end();

        let responseStatus = false;
        const { authorization } = req.headers;
        const token = authorization?.split(' ')[1];
        const headers = req.headers;
        const decoded = jwt.decode(token);
        const tokenSmartContract = decoded?.tokenSmartContract;
        const tokenId = parseInt(decoded?.tokenId);
        const bytes = parseInt(headers['x-content-length']);

        const pxNft = new web3.eth.Contract(contractABI, tokenSmartContract, {
            from: PUBLIC_KEY
        });

        await pxNft.methods.canUpload(tokenId, bytes).call((err, result) => {
            responseStatus = result;
        })

        if(responseStatus){
            const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest');
            const gasEstimate = await pxNft.methods.updateStorageUsage(tokenId,bytes).estimateGas();
            const tx = {
                'from': PUBLIC_KEY,
                'to': tokenSmartContract,
                'nonce': nonce,
                'gas': gasEstimate,
                'data': pxNft.methods.updateStorageUsage(tokenId,bytes).encodeABI()
            };
            const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
            await signPromise.then((signedTx) => {
                web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
                    if (!err) {
                        return res.status(200).send();
                    } else {
                        return res.status(401).send();
                    }
                });
            })
        }
        else {
            return res.status(401).send();
        }
    } catch (e) {
        return res.status(500).send();
    }
}
export default handler
