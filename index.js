require('dotenv').config()

const express = require('express')
const path = require('path')
const session = require('express-session')
const { ExpressOIDC } = require('@okta/oidc-middleware')

const todoRouter = require('./todo')

const oidc = new ExpressOIDC({
  issuer: `${process.env.OKTA_ORG_URL}/oauth2/default`,
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  redirect_uri: `${process.env.HOST_URL}/authorization-code/callback`,
  scope: 'openid profile'
})

const app = express()

app.use(express.static('assets'));
app.use(express.static('assets/images')); 

app.use(session({
  secret: process.env.APP_SECRET,
  resave: true,
  saveUninitialized: false
}))
app.use(oidc.router)

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')

app.use(express.urlencoded({ extended: true }))
app.use('/todo', oidc.ensureAuthenticated(), todoRouter)

app.get('/logout', (req, res) => {
  if (req.userContext) {
    const idToken = req.userContext.tokens.id_token
    const to = encodeURI(process.env.HOST_URL)
    const params = `id_token_hint=${idToken}&post_logout_redirect_uri=${to}`
    req.logout()
    res.redirect(`${process.env.OKTA_ORG_URL}/oauth2/default/v1/logout?${params}`)
  } else {
    res.redirect('/')
  }
})

app.get('/', (req, res) => {
  const { userinfo } = req.userContext || {}

  res.render('index', {
    userinfo,
    title: '{ To-Do List }',
    content: ' { Welcome, this App uses Okta for Secure Authentication }',
    style: 'style.css'
  })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Okta Demo App listening on port ${port}`))
