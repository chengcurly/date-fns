import firebase from 'firebase'
import path from 'path'
import fs from 'fs'
import childProcess from 'child_process'
import listLocales from './_lib/listLocales'

const {
  FIREBASE_EMAIL,
  FIREBASE_PASSWORD,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID
} = process.env

const prereleaseRegExp = /(test|alpha|beta|rc)/

const features = {
  docs: true,
  i18n: true,
  benchmarks: true,
  camelCase: true,
  fp: true,
  esm: true,
  utc: false
}

const importExample = [`import format from 'date-fns/format'`]
  .concat(`format(new Date(2014, 1, 11), 'MM/DD/YYYY')`)
  .concat(`//=> '02/11/2014'`)
  .join('\n')

const constExample = [`dateFns.format(new Date(2014, 1, 11), 'MM/DD/YYYY')`]
  .concat(`//=> '02/11/2014'`)
  .join('\n')

function generateGettingStarted (version) {
  return {
    npm: {
      title: 'npm',
      install: `npm install date-fns@${version} --save`,
      example: importExample,
      link: 'https://www.npmjs.com/package/date-fns'
    },

    yarn: {
      title: 'Yarn',
      install: `yarn add date-fns@${version}`,
      example: importExample,
      link: 'https://www.npmjs.com/package/date-fns'
    },

    bower: {
      title: 'Bower',
      install: `bower install date-fns#${version}`,
      example: constExample,
      link: 'https://libraries.io/bower/date-fns'
    },

    cdn: {
      title: 'CDN & Download',
      install: `<script src="http://cdn.date-fns.org/v${version}/date_fns.min.js"></script>`,
      example: constExample,
      link: `http://cdn.date-fns.org/v${version}/date_fns.min.js`
    }
  }
}

function generateVersion () {
  const version = fs.readFileSync(path.join(process.cwd(), 'VERSION'))
    .toString()
    .replace(/[\s\n]/g, '')

  const tag = `v${version}`

  const commit = childProcess.execSync('git rev-parse HEAD')
    .toString()
    .replace(/[\s\n]/g, '')

  const date = parseInt(
    childProcess.execSync('git show -s --format=%ct')
      .toString()
      .replace(/[\s\n]/g, ''),
    10
  ) * 1000

  const docsJSON = fs.readFileSync(path.join(process.cwd(), 'dist', 'date_fns_docs.json'))
    .toString()
  const docs = JSON.parse(docsJSON)
  const docsCategories = Object.keys(docs)
  const docsIndices = docsCategories
    .reduce((acc, category) => {
      acc[category] = docs[category]
        .map(({urlId, category, title, description}, index) => ({urlId, category, title, description, index}))
      return acc
    }, {})

  const locales = listLocales().map((locale) => locale.code)

  const gettingStarted = generateGettingStarted(version)

  return {
    tag,
    date,
    prerelease: Boolean(prereleaseRegExp.exec(tag)),
    commit,
    docs,
    docsIndices,
    docsCategories,
    gettingStarted,
    locales,
    features
  }
}

function generateVersionIndex (version, index) {
  const {tag, date, prerelease} = version
  return {
    tag,
    date,
    prerelease,
    index
  }
}

firebase.initializeApp({
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID
})

firebase.auth()
  .signInWithEmailAndPassword(FIREBASE_EMAIL, FIREBASE_PASSWORD)
  .then(() => {
    const versionList = firebase.database().ref('/versions')
    const newVersion = versionList.push()
    const newVersionData = generateVersion()

    const versionIndexList = firebase.database().ref('/versionIndices')
    const newVersionIndex = versionIndexList.push()
    const newVersionIndexData = generateVersionIndex(newVersionData, newVersion.key)

    return Promise.all([
      newVersion.set(newVersionData),
      newVersionIndex.set(newVersionIndexData)
    ])
  })
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch(({code, message}) => {
    console.log('Firebase returned an error:', code, message)
    process.exit(1)
  })
