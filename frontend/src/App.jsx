import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function getInitialSearch() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') === 'area' ? 'area' : 'pincode'
  return {
    mode,
    query: params.get('query') ?? '',
    city: params.get('city') ?? '',
  }
}

function updateSearchUrl(mode, query, city = '') {
  const params = new URLSearchParams({ mode, query })
  if (city) params.set('city', city)
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}?${params}${window.location.hash}`,
  )
}

function clearSearchUrl() {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.hash}`,
  )
}

async function getResponseData(response, fallbackMessage) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || data.message || fallbackMessage)
  }
  return data
}

function App() {
  const [initialSearch] = useState(getInitialSearch)
  const [mode, setMode] = useState(initialSearch.mode)
  const [pincode, setPincode] = useState(initialSearch.mode === 'pincode' ? initialSearch.query : '')
  const [pincodeResult, setPincodeResult] = useState(null)
  const [pincodeStatus, setPincodeStatus] = useState('idle')
  const [pincodeMessage, setPincodeMessage] = useState('Enter a six-digit pincode to find its post offices.')
  const [areaQuery, setAreaQuery] = useState(initialSearch.mode === 'area' ? initialSearch.query : '')
  const [cityQuery, setCityQuery] = useState(initialSearch.mode === 'area' ? initialSearch.city : '')
  const [areaResults, setAreaResults] = useState([])
  const [areaStatus, setAreaStatus] = useState('idle')
  const [areaMessage, setAreaMessage] = useState('')
  const [areaLocation, setAreaLocation] = useState({ state: '', district: '' })
  const areaSearchController = useRef(null)
  const initialAreaSearch = useRef(
    initialSearch.mode === 'area' && initialSearch.query ? initialSearch : null,
  )

  useEffect(() => () => areaSearchController.current?.abort(), [])

  useEffect(() => {
    if (mode !== 'pincode') return
    if (!pincode) {
      setPincodeResult(null)
      setPincodeStatus('idle')
      setPincodeMessage('Enter a six-digit pincode to find Your City.')
      return
    }

    if (pincode.length < 6) {
      setPincodeResult(null)
      setPincodeStatus('invalid')
      setPincodeMessage(`${6 - pincode.length} more digit${pincode.length === 5 ? '' : 's'} needed.`)
      return
    }

    const controller = new AbortController()
    const lookup = async () => {
      setPincodeStatus('loading')
      setPincodeMessage('Finding post offices…')
      updateSearchUrl('pincode', pincode)
      try {
        const query = new URLSearchParams({ query: pincode })
        const response = await fetch(`${API_URL}/lookup?${query}`, { signal: controller.signal })
        const data = await getResponseData(response, 'Pincode not found.')
        setPincodeResult(data)
        setPincodeStatus('success')
        setPincodeMessage('Pincode found.')
      } catch (error) {
        if (error.name === 'AbortError') return
        setPincodeResult(null)
        setPincodeStatus('error')
        setPincodeMessage(error.message || 'Unable to reach the lookup service.')
      }
    }

    const timer = setTimeout(lookup, 350)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [mode, pincode])

  const handlePincodeChange = (event) => {
    clearSearchUrl()
    setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))
  }

  const runAreaLookup = useCallback(async (areaName, cityName, updateUrl = true) => {
    const searchTerm = areaName.trim()
    const cityFilter = cityName.trim()
    if (!searchTerm) {
      setAreaStatus('error')
      setAreaMessage('Enter an area or post-office name.')
      return
    }

    areaSearchController.current?.abort()
    const controller = new AbortController()
    areaSearchController.current = controller
    setAreaStatus('loading')
    setAreaMessage('Searching post offices…')
    setAreaResults([])
    if (updateUrl) updateSearchUrl('area', searchTerm, cityFilter)

    const query = new URLSearchParams({ query: searchTerm })
    if (cityFilter) query.set('city', cityFilter)

    try {
      const response = await fetch(`${API_URL}/lookup?${query}`, { signal: controller.signal })
      const data = await getResponseData(response, 'No matching post offices found.')
      setAreaResults(data.offices)
      setAreaLocation({ state: data.state, district: data.district })
      setAreaStatus(data.offices.length ? 'success' : 'empty')
      setAreaMessage(data.offices.length ? `${data.offices.length} matching post office${data.offices.length === 1 ? '' : 's'} found.` : 'No offices matched that city or district.')
    } catch (error) {
      if (error.name === 'AbortError') return
      setAreaResults([])
      setAreaStatus('error')
      setAreaMessage(error.message || 'Unable to reach the lookup service.')
    }
  }, [])

  useEffect(() => {
    const initialSearch = initialAreaSearch.current
    if (!initialSearch) return
    initialAreaSearch.current = null
    runAreaLookup(initialSearch.query, initialSearch.city, false)
  }, [runAreaLookup])

  const searchArea = (event) => {
    event.preventDefault()
    runAreaLookup(areaQuery, cityQuery)
  }

  const clearForm = () => {
    areaSearchController.current?.abort()
    clearSearchUrl()
    setPincode('')
    setAreaQuery('')
    setCityQuery('')
    setAreaResults([])
    setAreaStatus('idle')
    setAreaMessage('')
    setAreaLocation({ state: '', district: '' })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_32%),radial-gradient(circle_at_bottom_right,_#cffafe_0,_transparent_30%)] px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="badge badge-primary badge-outline mb-4 gap-2 p-3 font-medium">India address lookup</div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Pincode, made simple.</h1>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">Find post offices by pincode, or find pincodes using an area and optional city or district.</p>
        </div>

        <div className="card border border-white/80 bg-base-100 shadow-xl shadow-blue-950/10">
          <div className="card-body gap-6 p-6 sm:p-9">
            <div className="tabs tabs-boxed self-start" role="tablist" aria-label="Lookup method">
              <button className={`tab ${mode === 'pincode' ? 'tab-active' : ''}`} onClick={() => { clearSearchUrl(); setMode('pincode') }} role="tab" aria-selected={mode === 'pincode'} type="button">Search by pincode</button>
              <button className={`tab ${mode === 'area' ? 'tab-active' : ''}`} onClick={() => { clearSearchUrl(); setMode('area') }} role="tab" aria-selected={mode === 'area'} type="button">Search by city &amp; area</button>
            </div>

            {mode === 'pincode' ? (
              <>
                <label className="form-control w-full">
                  <div className="label"><span className="label-text text-base font-semibold text-white">Enter a 6-digit pincode</span></div>
                  <input
                    aria-describedby="pincode-status"
                    className={`input input-bordered h-14 w-full text-xl tracking-[0.22em] ${pincodeStatus === 'error' ? 'input-error' : pincodeStatus === 'success' ? 'input-success' : 'focus:input-primary'}`}
                    inputMode="numeric"
                    maxLength="6"
                    onChange={handlePincodeChange}
                    placeholder="110001"
                    value={pincode}
                  />
                </label>

                <div id="pincode-status" className={`alert ${pincodeStatus === 'error' ? 'alert-error' : pincodeStatus === 'success' ? 'alert-success' : 'alert-info'}`} role="status">
                  <span>{pincodeStatus === 'loading' && <span className="loading loading-spinner loading-sm mr-2" />}{pincodeMessage}</span>
                </div>

                {pincodeResult && (
                  <OfficeResults
                    offices={pincodeResult.offices}
                    state={pincodeResult.state}
                    district={pincodeResult.district}
                    showPincode={false}
                  />
                )}
              </>
            ) : (
              <form className="grid gap-4" onSubmit={searchArea}>
                <label className="form-control w-full">
                  <span className="label-text mb-2 font-semibold text-white">Area / post-office name</span>
                  <input className="input input-bordered w-full" onChange={(event) => { clearSearchUrl(); areaSearchController.current?.abort(); setAreaQuery(event.target.value); setAreaResults([]); setAreaStatus('idle'); setAreaMessage('') }} placeholder="e.g. Connaught Place" value={areaQuery} />
                </label>
                <label className="form-control w-full">
                  <span className="label-text mb-2 font-semibold text-white">City / district (optional)</span>
                  <input className="input input-bordered w-full" onChange={(event) => { clearSearchUrl(); areaSearchController.current?.abort(); setCityQuery(event.target.value); setAreaResults([]); setAreaStatus('idle'); setAreaMessage('') }} placeholder="e.g. Central Delhi" value={cityQuery} />
                </label>
                <button className="btn btn-primary" disabled={areaStatus === 'loading'} type="submit">
                  {areaStatus === 'loading' && <span className="loading loading-spinner loading-sm" />}
                  Find pincode
                </button>
                {areaMessage && (
                  <div className={`alert ${areaStatus === 'error' ? 'alert-error' : areaStatus === 'success' ? 'alert-success' : areaStatus === 'empty' ? 'alert-warning' : 'alert-info'}`} role="status">{areaMessage}</div>
                )}
                {areaResults.length > 0 && (
                  <OfficeResults
                    offices={areaResults}
                    state={areaLocation.state}
                    district={areaLocation.district}
                    showPincode
                  />
                )}
              </form>
            )}

            <div className="card-actions justify-end pt-2">
              <button className="btn btn-ghost" disabled={!pincode && !areaQuery && !cityQuery} onClick={clearForm} type="button">Clear form</button>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">Try pincode: 110001, 560001, 400001, or 361305</p>
      </section>
    </main>
  )
}

function OfficeResults({ offices, state, district, showPincode }) {
  return (
    <section className="rounded-box border border-base-300 p-4" aria-label="Post office results">
      <p className="mb-3 text-sm font-medium text-slate-600">{district}, {state}</p>
      <ul className="grid gap-3">
        {offices.map((office, index) => (
          <li className="rounded-box bg-slate-50 p-4" key={`${office.officeName}-${office.pincode}-${index}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{office.officeName}</p>
                <p className="mt-1 text-sm text-slate-600">{office.officeType} · {office.deliveryStatus}</p>
              </div>
              {showPincode && <p className="font-mono text-lg font-bold text-primary">{office.pincode}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default App
