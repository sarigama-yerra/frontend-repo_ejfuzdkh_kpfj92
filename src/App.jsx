import { useEffect, useState } from 'react'
import { ChakraProvider, Box, Container, Heading, Text, VStack, HStack, Button, Input, Avatar, Tabs, TabList, TabPanels, Tab, TabPanel, useToast, Divider, Badge } from '@chakra-ui/react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Home() {
  return (
    <VStack spacing={6} py={12}>
      <Heading size="2xl">ChatMind</Heading>
      <Text color="gray.500">Real-time chat with direct messages and groups</Text>
      <HStack>
        <Button colorScheme="blue" as="a" href="/login">Login</Button>
        <Button variant="outline" as="a" href="/signup">Sign Up</Button>
      </HStack>
    </VStack>
  )
}

function Login({ onLogin }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submit = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.user)
    } catch (e) {
      toast({ title: 'Login failed', status: 'error' })
    }
  }
  return (
    <VStack spacing={4} py={8}>
      <Heading size="lg">Login</Heading>
      <Input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <Button colorScheme="blue" onClick={submit}>Login</Button>
      <Button variant="link" as="a" href="/forgot">Forgot password?</Button>
    </VStack>
  )
}

function Signup() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submit = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) })
      if (!r.ok) throw new Error(await r.text())
      toast({ title: 'Account created. Please login.', status: 'success' })
      window.location.href = '/login'
    } catch (e) {
      toast({ title: 'Sign up failed', status: 'error' })
    }
  }
  return (
    <VStack spacing={4} py={8}>
      <Heading size="lg">Create account</Heading>
      <Input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <Input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <Button colorScheme="blue" onClick={submit}>Sign Up</Button>
    </VStack>
  )
}

function Forgot() {
  return (
    <VStack spacing={4} py={8}>
      <Heading size="lg">Forgot Password</Heading>
      <Text color="gray.500">In this demo, enter your email and we will show a success message.</Text>
      <Input placeholder="Email" />
      <Button colorScheme="blue">Send reset link</Button>
    </VStack>
  )
}

function Chat() {
  const toast = useToast()
  const me = JSON.parse(localStorage.getItem('user') || 'null')
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const wsRef = useState(null)

  useEffect(() => {
    if (!me) return
    fetch(`${API_BASE}/chats/${me.id}`).then(r=>r.json()).then(d=>setRooms(d.rooms || []))
  }, [])

  useEffect(() => {
    if (!activeRoom) return
    fetch(`${API_BASE}/messages/${activeRoom.id}`).then(r=>r.json()).then(d=>setMessages(d.messages || []))
    // websocket
    const ws = new WebSocket((API_BASE.replace('http', 'ws')) + `/ws/rooms/${activeRoom.id}`)
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        if (data.type === 'message') {
          setMessages(m => [...m, data.payload])
        }
      } catch {}
    }
    return () => ws.close()
  }, [activeRoom?.id])

  const send = async () => {
    if (!text.trim() || !activeRoom) return
    const body = { room_id: activeRoom.id, sender_id: me.id, content: text }
    const r = await fetch(`${API_BASE}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) setText('')
  }

  const search = async () => {
    const r = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`)
    const d = await r.json()
    setResults(d.users || [])
  }

  const startDirect = async (other) => {
    const body = { user_id: me.id, other_user_id: other.id }
    const r = await fetch(`${API_BASE}/chats/direct`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.room_id) {
      const updated = await fetch(`${API_BASE}/chats/${me.id}`).then(r=>r.json())
      setRooms(updated.rooms || [])
      setActiveRoom({ id: d.room_id, name: other.name, type: 'direct', members: [me.id, other.id] })
    }
  }

  return (
    <HStack align="start" spacing={4} py={4}>
      <VStack minW="280px" align="stretch" spacing={3}>
        <HStack>
          <Avatar name={me?.name} size="sm" />
          <Text fontWeight="bold">{me?.name}</Text>
        </HStack>
        <Divider />
        <Input placeholder="Search users" value={q} onChange={e=>setQ(e.target.value)} />
        <Button onClick={search}>Search</Button>
        <VStack align="stretch" spacing={2}>
          {results.map(u => (
            <HStack key={u.id} justify="space-between" p={2} borderWidth="1px" borderRadius="md">
              <HStack><Avatar name={u.name} size="sm" /><Box><Text>{u.name}</Text><Text fontSize="sm" color="gray.500">{u.email}</Text></Box></HStack>
              <Button size="sm" onClick={()=>startDirect(u)}>Chat</Button>
            </HStack>
          ))}
        </VStack>
        <Divider />
        <Heading size="sm">Your Chats</Heading>
        <VStack align="stretch" spacing={1}>
          {rooms.map(r => (
            <Box key={r.id} p={2} borderRadius="md" borderWidth={activeRoom?.id===r.id? '2px':'1px'} cursor="pointer" onClick={()=>setActiveRoom(r)}>
              <HStack justify="space-between">
                <Text fontWeight="medium">{r.name || 'Direct chat'}</Text>
                <Badge>{r.type}</Badge>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>

      <Box flex="1" borderWidth="1px" borderRadius="md" p={4} minH="70vh">
        {!activeRoom ? (
          <VStack h="100%" justify="center" color="gray.500"><Text>Select a chat to start messaging</Text></VStack>
        ) : (
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Heading size="md">{activeRoom.name || 'Direct chat'}</Heading>
              <Badge>{activeRoom.type}</Badge>
            </HStack>
            <Divider />
            <VStack align="stretch" spacing={3} maxH="55vh" overflowY="auto">
              {messages.map(m => (
                <Box key={m.id} alignSelf={m.sender_id===me.id? 'flex-end':'flex-start'} bg={m.sender_id===me.id? 'blue.50':'gray.50'} borderRadius="lg" p={3} maxW="70%">
                  <Text>{m.content}</Text>
                </Box>
              ))}
            </VStack>
            <HStack>
              <Input placeholder="Type a message" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send() }} />
              <Button colorScheme="blue" onClick={send}>Send</Button>
            </HStack>
          </VStack>
        )}
      </Box>
    </HStack>
  )
}

function Shell() {
  const [route, setRoute] = useState(window.location.pathname)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  useEffect(() => {
    if (!user && route.startsWith('/chat')) navigate('/login')
  }, [user, route])

  let content = null
  if (route === '/') content = <Home />
  else if (route === '/login') content = <Login onLogin={(u)=>{ setUser(u); navigate('/chat') }} />
  else if (route === '/signup') content = <Signup />
  else if (route === '/forgot') content = <Forgot />
  else content = <Chat />

  return (
    <ChakraProvider>
      <Container maxW="6xl" py={8}>
        <VStack align="stretch" spacing={6}>
          <HStack justify="space-between">
            <Heading size="lg" cursor="pointer" onClick={()=>navigate('/')}>ChatMind</Heading>
            <HStack>
              {user ? (
                <HStack>
                  <Avatar name={user.name} size="sm" />
                  <Button size="sm" onClick={()=>{ localStorage.clear(); setUser(null); navigate('/') }}>Logout</Button>
                </HStack>
              ) : (
                <>
                  <Button variant="ghost" onClick={()=>navigate('/login')}>Login</Button>
                  <Button colorScheme="blue" onClick={()=>navigate('/signup')}>Sign Up</Button>
                </>
              )}
            </HStack>
          </HStack>
          {content}
        </VStack>
      </Container>
    </ChakraProvider>
  )
}

export default Shell
