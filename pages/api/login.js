require("dotenv").config()
const jwt = require('jsonwebtoken');
const ethUtil = require("ethereumjs-util");

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const TESTNET_API_URL = process.env.TESTNET_API_URL;
const NFT_COLLECTION_CONTRACT = process.env.NFT_COLLECTION_CONTRACT;
const POLLINATIONX_API_ENDPOINT = process.env.POLLINATIONX_API_ENDPOINT;

const handler = async (req, res) => {
  try {
    const { key, wallet, chain, signature } = req.query
    let { nonce } = req.query
    if (!chain || !wallet || !signature || !nonce) return res.status(400).json({ error: 'invalid params' });
    let web3 = null

    if (chain === '0x13881') { //0x5 GOERLI
      web3 = createAlchemyWeb3(TESTNET_API_URL)
    } else {
      return res.json({ error: 'Chain not supported' })
    }

    nonce = "\x19Ethereum Signed Message:\n" + nonce.length + nonce
    nonce = ethUtil.keccak(Buffer.from(nonce, "utf-8"))
    const { v, r, s } = ethUtil.fromRpcSig(signature)
    const pubKey = ethUtil.ecrecover(ethUtil.toBuffer(nonce), v, r, s)
    const addrBuf = ethUtil.pubToAddress(pubKey)
    const addr = ethUtil.bufferToHex(addrBuf)

    const _nfts = await web3.alchemy.getNfts({
      owner: addr
    })

    const nfts = []
    let accessToken = "";
    _nfts.ownedNfts.forEach(nft => {
      if (NFT_COLLECTION_CONTRACT.toLowerCase().split(',').indexOf(nft.contract.address.toLowerCase()) !== -1) {
        let tokenId = nft.id.tokenId;
        accessToken = jwt.sign(
            { 
              address: wallet, 
              tokenId: tokenId,
              tokenSmartContract: NFT_COLLECTION_CONTRACT,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "1h"
            }
        );
        nft.jwt = accessToken;
        nft.endpoint = POLLINATIONX_API_ENDPOINT;
        nfts.push(nft)
      }
    })

    return res.status(200).json({ success: true, nfts, totalCount: nfts.length})
  } catch (e) {
    return res.status(500).json({ error: e });
  }
}

export default handler
