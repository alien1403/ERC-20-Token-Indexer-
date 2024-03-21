import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Image,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Link
} from '@chakra-ui/react'
import { Alchemy, Network, Utils } from 'alchemy-sdk'
import { ethers } from 'ethers'
import { useState } from 'react'
import ClipLoader from 'react-spinners/ClipLoader'

function App () {
  const [userAddress, setUserAddress] = useState('')
  const [results, setResults] = useState([])
  const [hasQueried, setHasQueried] = useState(false)
  const [tokenDataObjects, setTokenDataObjects] = useState([])
  const [loadingInProgress, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loggedAccount, setLoggedAccount] = useState('')
  const [typeToken, setTypeToken] = useState('')

  async function connectWallet () {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const newAccount = await provider.getSigner()
      const address = await newAccount.getAddress()
      setUserAddress(address)
      setLoggedAccount(address)
    } else {
      console.log('Install a wallet like MetaMask or Phantom')
    }
  }

  function shortAddress (address) {
    return `${address.slice(0, 5)}...${address.slice(-4)}`
  }

  async function getTokens (type) {
    const config = {
      apiKey: import.meta.env.VITE_ALCHEMY_KEY || '',
      network: Network.ETH_MAINNET
    }

    const alchemy = new Alchemy(config)

    if (!userAddress) {
      setErrorMessage('Missing address')
      return false
    }
    setErrorMessage('')

    const address = await alchemy.core.resolveName(userAddress)
    if (address) setUserAddress(address)

    setLoading(true)

    try {
      setResults([])
      setHasQueried(false)
      setTokenDataObjects([])
      setTypeToken(type)

      if (type === 'erc20') {
        const data = await alchemy.core.getTokenBalances(userAddress)

        data.tokenBalances = data.tokenBalances.map(item => {
          item.tokenBalance = item.tokenBalance.toString()
          return item
        }).filter((item) => item.tokenBalance > 0)

        setResults(data.tokenBalances)

        const tokenData = []

        for (const item of data.tokenBalances) {
          const result = await alchemy.core.getTokenMetadata(
            item.contractAddress
          )
          tokenData.push(result)
        }
        setLoading(false)

        setTokenDataObjects(tokenData)
        setHasQueried(true)

      } else {
        const data = await alchemy.nft.getNftsForOwner(userAddress)

        setResults(data.ownedNfts)

        const tokenData = []

        for (const item of data.ownedNfts) {
          const result = await alchemy.nft.getNftMetadata(
            item.contract.address,
            item.tokenId
          )
          tokenData.push(result)
        }

        console.log(data.ownedNfts)
        console.log(tokenData)
        setLoading(false)

        setTokenDataObjects(tokenData)
        setHasQueried(true)
      }
    } catch (err) {
      setLoading(false)
      setTokenDataObjects([])
      setResults([])
      if (err.message.includes('ENS name not configured')) {
        setErrorMessage('Check address or ENS name')
      } else {
        setErrorMessage('Error during API call')
      }
    }
  }
  return (
    <Box w='100vw'>
      {!loggedAccount &&
      (
        <Button
          className='loginButton'
          onClick={connectWallet}
        >
          Get your address from Wallet
        </Button>
      )}
      {loadingInProgress && (
        <div className='loader-container'>
          <ClipLoader color='#fff' loading={loadingInProgress} size={150} />
        </div>)}
      <Center>
        <Flex
          alignItems='center'
          justifyContent='center'
          flexDirection='column'
        >
          <Heading mb={0} fontSize={36}>
            ERC-20/ERC-721 Token Indexer
          </Heading>
          <Text>
            Based on the address, you will be able to see your ERC-20/ERC-721 token balances.
          </Text>
        </Flex>
      </Center>
      <Flex
        w='100%'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
      >
        <Heading mt={42}>
          Get all the ERC-20/ERC-721 token balances of this address:
        </Heading>
        <Input
          onChange={(e) => setUserAddress(e.target.value)}
          color='black'
          w='600px'
          textAlign='center'
          p={4}
          bgColor='white'
          fontSize={24}
          required
          value={userAddress}
        />
        <div>
          <Button fontSize={20} onClick={() => getTokens('erc20')} mt={36} mr={10}>
            Check ERC-20 Tokens
          </Button>
          <Button fontSize={20} onClick={() => getTokens('erc721')} mt={36} ml={10}>
            Check ERC-721 Tokens
          </Button>
        </div>

        {errorMessage !== '' && (
          <p className='errorMessage'>{errorMessage}</p>
        )}

        {hasQueried && typeToken === 'erc20' &&
          (
            <div>
              <Heading my={36}>ERC-20 token balances:</Heading>
              {results.length > 0
                ? (
                  <div className='containerTable'>
                    <TableContainer w='90vw'>
                      <Table size='sm'>
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Symbol</Th>
                            <Th isNumeric>Balance</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {results.map((e, i) => {
                            return (
                              <Tr
                                key={i}
                              >
                                <Td>${tokenDataObjects[i].name}</Td>
                                <Td>${tokenDataObjects[i].symbol}</Td>
                                <Td isNumeric>{Utils.formatUnits(
                                  e.tokenBalance,
                                  tokenDataObjects[i].decimals
                                )}
                                </Td>
                              </Tr>
                            )
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>
                    <small>Note: only the first 1000 results are shown</small>
                  </div>
                  )
                : <p className='noTokens'>No tokens with positive balance found</p>}
            </div>
          )}

        {hasQueried && typeToken === 'erc721' &&
          (
            <div>
              <Heading my={36}>ERC-720 tokens:</Heading>
              {results.length > 0
                ? (
                  <div className='containerTable'>
                    <SimpleGrid w='90vw' columns={4} spacing={24}>
                      {results.map((e, i) => {
                        return (
                          <Flex
                            flexDir='column'
                            color='black'
                            w='20vw'
                            key={i}
                          >
                            <Box p={10} bg='#ccc'>
                              <b>Name:</b> {tokenDataObjects[i].title.replace(`#${tokenDataObjects[i].tokenId}`, '')}<br />
                              <b>ID:</b> #{tokenDataObjects[i].tokenId} <br />
                              <b>Address:</b> {shortAddress(tokenDataObjects[i].contract.address)} <small><i className='pointer' onClick={() => { navigator.clipboard.writeText(tokenDataObjects[i].contract.address) }}><u>(click for copy)</u></i></small><br />
                              <b>Opensea:</b> <Link color='black' href={`https://opensea.io/assets/ethereum/${tokenDataObjects[i].contract.address}/${tokenDataObjects[i].tokenId}`} title='' target='_blank' rel='noreferrer'><u>Link</u></Link>
                            </Box>
                            {(tokenDataObjects[i].media[0].format === 'jpg' || tokenDataObjects[i].media[0].format === 'jpeg' || tokenDataObjects[i].media[0].format === 'png')
                              ? (
                                <Image src={tokenDataObjects[i].media[0].thumbnail} />
                                )
                              : (
                                <p className='noTokens'>Media not found</p>
                                )}
                          </Flex>
                        )
                      })}
                    </SimpleGrid>
                    <small>Note: only the first 1000 results are shown</small>
                  </div>
                  )
                : <p className='noTokens'>No tokens with positive balance found</p>}
            </div>
          )}
      </Flex>
    </Box>
  )
}

export default App