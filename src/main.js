import './style.css'

const regexInput = document.getElementById('regex-input')
const testInput = document.getElementById('test-input')
const highlightLayer = document.getElementById('highlight-layer')
const errorMessage = document.getElementById('error-message')
const flagsDisplay = document.getElementById('flags-display')
const matchCountEl = document.getElementById('match-count')
const matchesList = document.getElementById('matches-list')

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

updateFlagsDisplay()
updateMatches()