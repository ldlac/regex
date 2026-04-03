import './style.css'

const regexInput = document.getElementById('regex-input')
const testInput = document.getElementById('test-input')
const highlightLayer = document.getElementById('highlight-layer')
const errorMessage = document.getElementById('error-message')
const flagsDisplay = document.getElementById('flags-display')
const matchCountEl = document.getElementById('match-count')
const matchesList = document.getElementById('matches-list')
const explainerList = document.getElementById('explainer-list')
const copyBtn = document.getElementById('copy-btn')

const flagInputs = {
  g: document.getElementById('flag-g'),
  i: document.getElementById('flag-i'),
  m: document.getElementById('flag-m'),
  s: document.getElementById('flag-s'),
  u: document.getElementById('flag-u')
}

function getFlags() {
  let flags = ''
  for (const [flag, input] of Object.entries(flagInputs)) {
    if (input.checked) flags += flag
  }
  return flags || 'g'
}

function updateFlagsDisplay() {
  const flags = getFlags()
  flagsDisplay.textContent = flags || 'g'
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function highlightMatches(text, matches) {
  if (!matches.length) {
    return escapeHtml(text)
  }

  const sortedMatches = [...matches].sort((a, b) => a.index - b.index)

  let result = ''
  let lastIndex = 0

  for (const match of sortedMatches) {
    if (match.index > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, match.index))
    }

    result += `<span class="match">${escapeHtml(match.text)}</span>`
    lastIndex = match.index + match.text.length
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex))
  }

  return result
}

function findMatches(pattern, flags, text) {
  const matches = []
  
  try {
    const regex = new RegExp(pattern, flags)
    
    if (flags.includes('g')) {
      let match
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1),
          namedGroups: match.groups || {}
        })
        
        if (match.index === regex.lastIndex) {
          regex.lastIndex++
        }
      }
    } else {
      const match = regex.exec(text)
      if (match) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1),
          namedGroups: match.groups || {}
        })
      }
    }
  } catch (e) {
  }
  
  return matches
}

function explainRegex(pattern) {
  if (!pattern) return []
  
  const tokens = []
  let i = 0
  
  while (i < pattern.length) {
    const char = pattern[i]
    const next = pattern[i + 1]
    
    if (char === '[') {
      const closeIdx = pattern.indexOf(']', i)
      if (closeIdx !== -1) {
        const classContent = pattern.slice(i, closeIdx + 1)
        let desc = 'Matches one character: '
        if (classContent[1] === '^') {
          desc = 'Matches one character NOT in: ' + classContent.slice(2, -1)
        } else if (classContent.includes('-')) {
          desc = 'Matches one character in range: ' + classContent.slice(1, -1)
        } else {
          desc = 'Matches one of: ' + classContent.slice(1, -1)
        }
        tokens.push({ token: classContent, desc })
        i = closeIdx + 1
        continue
      }
    }
    
    if (char === '\\' && next) {
      const escapeMap = {
        'd': 'Matches any digit (0-9)',
        'D': 'Matches any non-digit',
        'w': 'Matches any word character (a-z, A-Z, 0-9, _)',
        'W': 'Matches any non-word character',
        's': 'Matches any whitespace character',
        'S': 'Matches any non-whitespace character',
        'b': 'Matches a word boundary',
        'B': 'Matches a non-word boundary',
        'n': 'Matches a newline',
        'r': 'Matches a carriage return',
        't': 'Matches a tab',
        '0': 'Matches null character',
        '.': 'Matches a literal dot',
        '^': 'Matches literal caret',
        '$': 'Matches literal dollar',
        '*': 'Matches literal asterisk',
        '+': 'Matches literal plus',
        '?': 'Matches literal question mark',
        '\\': 'Matches literal backslash',
        '/': 'Matches literal forward slash',
        '[': 'Matches literal open bracket',
        ']': 'Matches literal close bracket',
        '(': 'Matches literal open parenthesis',
        ')': 'Matches literal close parenthesis',
        '{': 'Matches literal open brace',
        '}': 'Matches literal close brace',
        '|': 'Matches literal pipe'
      }
      
      if (escapeMap[next]) {
        tokens.push({ token: '\\' + next, desc: escapeMap[next] })
      } else {
        tokens.push({ token: '\\' + next, desc: `Matches literal "${next}"` })
      }
      i += 2
      continue
    }
    
    if (char === '*') {
      tokens.push({ token: '*', desc: 'Matches previous element 0 or more times' })
      i++
      continue
    }
    if (char === '+') {
      tokens.push({ token: '+', desc: 'Matches previous element 1 or more times' })
      i++
      continue
    }
    if (char === '?') {
      tokens.push({ token: '?', desc: 'Matches previous element 0 or 1 time (optional)' })
      i++
      continue
    }
    if (char === '{') {
      const closeIdx = pattern.indexOf('}', i)
      if (closeIdx !== -1) {
        const quant = pattern.slice(i, closeIdx + 1)
        const nums = quant.slice(1, -1).split(',')
        if (nums.length === 1) {
          tokens.push({ token: quant, desc: `Matches exactly ${nums[0]} times` })
        } else if (nums[1] === '') {
          tokens.push({ token: quant, desc: `Matches ${nums[0]} or more times` })
        } else {
          tokens.push({ token: quant, desc: `Matches ${nums[0]} to ${nums[1]} times` })
        }
        i = closeIdx + 1
        continue
      }
    }
    
    if (char === '^') {
      tokens.push({ token: '^', desc: 'Matches start of string/line' })
      i++
      continue
    }
    if (char === '$') {
      tokens.push({ token: '$', desc: 'Matches end of string/line' })
      i++
      continue
    }
    
    if (char === '(') {
      if (next === '?') {
        if (pattern[i + 2] === ':') {
          tokens.push({ token: '(?:', desc: 'Non-capturing group' })
          i += 3
          continue
        }
        if (pattern[i + 2] === '=') {
          tokens.push({ token: '(?=', desc: 'Positive lookahead - matches if followed by' })
          i += 3
          continue
        }
        if (pattern[i + 2] === '!') {
          tokens.push({ token: '(?!', desc: 'Negative lookahead - matches if NOT followed by' })
          i += 3
          continue
        }
        if (pattern[i + 2] === '<') {
          if (pattern[i + 3] === '=') {
            tokens.push({ token: '(?<=', desc: 'Positive lookbehind - matches if preceded by' })
            i += 4
            continue
          }
          if (pattern[i + 3] === '!') {
            tokens.push({ token: '(?<!', desc: 'Negative lookbehind - matches if NOT preceded by' })
            i += 4
            continue
          }
        }
      }
      tokens.push({ token: '(', desc: 'Start of capturing group' })
      i++
      continue
    }
    if (char === ')') {
      tokens.push({ token: ')', desc: 'End of group' })
      i++
      continue
    }
    
    if (char === '|') {
      tokens.push({ token: '|', desc: 'OR - matches either left or right side' })
      i++
      continue
    }
    
    if (char === '.') {
      tokens.push({ token: '.', desc: 'Matches any character (except newline by default)' })
      i++
      continue
    }
    
    tokens.push({ token: char, desc: `Matches literal "${char}"` })
    i++
  }
  
  return tokens
}

function updateMatches() {
  const pattern = regexInput.value
  const testText = testInput.value
  const flags = getFlags()
  
  const inputWrapper = regexInput.closest('.input-wrapper')
  inputWrapper.classList.remove('error')
  errorMessage.textContent = ''
  
  if (!pattern) {
    highlightLayer.innerHTML = escapeHtml(testText)
    matchCountEl.textContent = '0 matches'
    matchesList.innerHTML = '<p class="no-matches" id="no-matches">No matches found</p>'
    explainerList.innerHTML = '<p class="no-matches">Enter a regex pattern to see explanation</p>'
    return
  }
  
  try {
    new RegExp(pattern, flags)
  } catch (e) {
    inputWrapper.classList.add('error')
    errorMessage.textContent = e.message
    highlightLayer.innerHTML = escapeHtml(testText)
    matchCountEl.textContent = '0 matches'
    matchesList.innerHTML = '<p class="no-matches" id="no-matches">No matches found</p>'
    explainerList.innerHTML = '<p class="no-matches">Invalid regex - fix errors to see explanation</p>'
    return
  }
  
  const matches = findMatches(pattern, flags, testText)
  
  highlightLayer.innerHTML = highlightMatches(testText, matches)
  
  highlightLayer.scrollTop = testInput.scrollTop
  
  matchCountEl.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`
  if (matches.length === 0) {
    matchesList.innerHTML = '<p class="no-matches" id="no-matches">No matches found</p>'
  } else {
    matchesList.innerHTML = matches.map((match, i) => `
      <div class="match-item" data-index="${match.index}" data-length="${match.text.length}">
        <div class="match-item-header">
          <span class="match-text">"${escapeHtml(match.text)}"</span>
          <span class="match-index">${match.index}-${match.index + match.text.length}</span>
        </div>
        ${match.groups.length > 0 ? `
          <div class="match-groups">
            ${match.groups.map((g, gi) => `<span>$${gi + 1}: ${escapeHtml(g || '')}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')
  }
  
  const explanations = explainRegex(pattern)
  if (explanations.length === 0) {
    explainerList.innerHTML = '<p class="no-matches">No explanation available</p>'
  } else {
    explainerList.innerHTML = explanations.map(exp => `
      <div class="explainer-item">
        <span class="explainer-token">${escapeHtml(exp.token)}</span>
        <span class="explainer-desc">${exp.desc}</span>
      </div>
    `).join('')
  }
}

regexInput.addEventListener('input', updateMatches)
testInput.addEventListener('input', updateMatches)
testInput.addEventListener('scroll', () => {
  highlightLayer.scrollTop = testInput.scrollTop
})

for (const input of Object.values(flagInputs)) {
  input.addEventListener('change', () => {
    updateFlagsDisplay()
    updateMatches()
  })
}

matchesList.addEventListener('click', (e) => {
  const matchItem = e.target.closest('.match-item')
  if (matchItem) {
    const index = parseInt(matchItem.dataset.index, 10)
    const length = parseInt(matchItem.dataset.length, 10)
    
    testInput.focus()
    testInput.setSelectionRange(index, index + length)
    
    const scrollPosition = (index / testText.length) * testInput.scrollHeight - 100
    testInput.scrollTop = Math.max(0, scrollPosition)
  }
})

copyBtn.addEventListener('click', () => {
  const explanations = explainRegex(regexInput.value)
  const text = explanations.map(exp => `${exp.token} - ${exp.desc}`).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.classList.add('copied')
    setTimeout(() => copyBtn.classList.remove('copied'), 1500)
  })
})

updateFlagsDisplay()
updateMatches()