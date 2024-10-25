'use client'
import React, { useState, useEffect, FC } from 'react'
import { Flame, Key, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Props for AnimatedNumber
interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  decimalPlaces?: number // Optional prop to specify decimal places
}

// Interface for Mint Action API Response
interface MintAction {
  icon: string
  title: string
  description: string
  label: string
  links: {
    actions: Array<{
      label: string
      href: string
    }>
  }
  disabled: boolean
}

// Interface for Burn Action API Response
interface BurnAction {
  icon: string
  title: string
  description: string
  label: string
  links: {
    actions: Array<{
      label: string
      href: string
    }>
  }
}

// Define the interface for CollectionStats
interface CollectionStats {
  id: string;
  slug: string;
  slugMe: string;
  slugDisplay: string;
  statsV2: {
    currency: string;
    buyNowPrice: number;
    buyNowPriceNetFees: number;
    sellNowPrice: number;
    sellNowPriceNetFees: number;
    numListed: number;
    numMints: number;
    floor1h: number;
    floor24h: number;
    floor7d: number;
    sales1h: number;
    sales24h: number;
    sales7d: number;
    salesAll: number;
    volume1h: number;
    volume24h: number;
    volume7d: number;
    volumeAll: number;
  };
  firstListDate: string;
  name: string;
}

const AnimatedNumber: FC<AnimatedNumberProps> = ({ value, prefix = '', suffix = '', decimalPlaces = 2 }) => {
  const [displayValue, setDisplayValue] = useState<number>(0)

  useEffect(() => {
    const animationDuration = 1000 // Duration in milliseconds
    const intervalTime = 100 // Interval time in milliseconds
    const totalSteps = Math.ceil(animationDuration / intervalTime)
    const stepFactor = value / totalSteps
    let currentStep = 0

    const interval = setInterval(() => {
      setDisplayValue(prev => {
        const nextValue = prev + stepFactor
        currentStep += 1
        if (currentStep >= totalSteps) {
          clearInterval(interval)
          return parseFloat(value.toFixed(decimalPlaces))
        }
        return parseFloat(nextValue.toFixed(decimalPlaces))
      })
    }, intervalTime)

    return () => clearInterval(interval)
  }, [value, decimalPlaces])

  return (
    <span className="font-mono">
      {prefix}
      {displayValue.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
      {suffix}
    </span>
  )
}

// CountdownTimer Component
const CountdownTimer: FC<{ timeleft: number }> = ({ timeleft }) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeleft) // 24 hours in seconds

  useEffect(() => {
    setTimeLeft(timeleft) // Update state when prop changes
    // Clear any existing intervals
    let timer: NodeJS.Timeout

    if (timeleft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }

    // Cleanup interval on unmount or when timeleft changes
    return () => clearInterval(timer)
  }, [timeleft])

  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60

  return (
    <div className="text-6xl font-mono font-bold mb-4">
      {hours.toString().padStart(2, '0')}:
      {minutes.toString().padStart(2, '0')}:
      {seconds.toString().padStart(2, '0')}
    </div>
  )
}

// Props for StatCard
interface StatCardProps {
  title: string
  value: React.ReactNode
  subtitle: string
  icon: JSX.Element
  trend?: 'up' | 'down' | null
  loading?: boolean
}

const StatCard: FC<StatCardProps> = ({ title, value, subtitle, icon, trend = null, loading = false }) => (
  <Card className="bg-white/10 hover:bg-white/20 transition-all duration-300 ease-in-out backdrop-blur-sm">
    <CardContent className="p-6">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-white/20 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-white/20 rounded w-1/4"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white/80 text-sm">{title}</h3>
            {icon}
          </div>
          <div className="text-2xl font-bold font-mono mb-1 text-white">
            {value}
            {trend && (
              <span className="ml-2">
                {trend === 'up' ? (
                  <TrendingUp className="inline w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="inline w-4 h-4 text-red-400" />
                )}
              </span>
            )}
          </div>
          <p className="text-white/60 text-xs">{subtitle}</p>
        </>
      )}
    </CardContent>
  </Card>
)

// DashboardComponent
export const DashboardComponent: FC = () => {
  const [loading, setLoading] = useState<boolean>(true)
  const [mintData, setMintData] = useState<MintAction | null>(null)
  const [burnData, setBurnData] = useState<BurnAction | null>(null)
  const [timeLeftInSeconds, setTimeLeftInSeconds] = useState<number>(0) // New state for time left

  // New state variables for collection stats
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  const [currentMintNumber, setCurrentMintNumber] = useState<number>(0)

  // State variables for token prices
  const [sendPrice, setSendPrice] = useState<number | null>(null)
  const [solPrice, setSolPrice] = useState<number | null>(null)

  useEffect(() => {
    // Fetch Mint Action Data
    const fetchMintData = async () => {
      try {
        const response = await fetch('https://sendfomo.com/api/actions/mint')
        const data: MintAction = await response.json()
        setMintData(data)
        parseTimeLeft(data.description) // Parse time left from description
      } catch (error) {
        console.error('Error fetching mint data:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchBurnData = async () => {
      try {
        const response = await fetch('https://sendfomo.com/api/actions/burn')
        const data: BurnAction = await response.json()
        setBurnData(data)
      } catch (error) {
        console.error('Error fetching burn data:', error)
      }
    }

    // Updated fetchStats to call the internal API route
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats?slugDisplay=sendfomo')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const stats: CollectionStats = await response.json()
        setCollectionStats(stats)
        setCurrentMintNumber(stats.statsV2.numMints + 1)
      } catch (error) {
        console.error('Error fetching collection stats:', error)
      }
    }

    // Fetch token prices from jup.ag Price API
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.jup.ag/price/v2?ids=SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa,So11111111111111111111111111111111111111112')
        const data = await response.json()
        setSendPrice(parseFloat(data.data.SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa.price))
        setSolPrice(parseFloat(data.data.So11111111111111111111111111111111111111112.price))
      } catch (error) {
        console.error('Error fetching token prices:', error)
      }
    }

    fetchMintData()
    fetchBurnData()
    fetchStats()
    fetchPrices()
  }, [])

  // Function to parse time left from description
  const parseTimeLeft = (description: string) => {
    // Updated regex to handle both singular and plural forms
    const timeRegex = /(\d+)\s*hrs?\s*(\d+)\s*mins?/i
    const match = description.match(timeRegex)
    if (match) {
      const hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const totalSeconds = hours * 3600 + minutes * 60
      console.log(`Parsed Time Left: ${totalSeconds} seconds`)
      setTimeLeftInSeconds(totalSeconds)
    } else {
      console.warn('Time left format is incorrect:', description)
      setTimeLeftInSeconds(0) // Optionally reset to 0 or a default value
    }
  }

  const handleMint = async () => {
    if (mintData && !mintData.disabled) {
      try {
        const response = await fetch(mintData.links.actions[0].href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Include body or other necessary data for minting
        })
        const result = await response.json()
        console.log(result, "result")
        alert('Mint successful!')
        // Handle post-mint actions here
      } catch (error) {
        console.error('Error during mint:', error)
        alert('Mint failed. Please try again.')
      }
    }
  }

  // Calculate Floor Price in USD
  const buyNowPriceInSol = collectionStats ? collectionStats.statsV2.buyNowPrice / 1000000000 : 0
  const floorPriceUSD = buyNowPriceInSol * (solPrice || 0)

  return (
    <div className="min-h-screen bg-[rgb(28,113,255)] text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">SEND FOMO</h1>
        <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
          <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
        </Button>
      </header>

      <section className="text-center mb-12">
        <h2 className="text-lg text-white/80 mb-2">Time until game ends</h2>
        <CountdownTimer timeleft={timeLeftInSeconds} />
        <h1 className="text-5xl font-bold mb-4">SEND FOMO</h1>
        <p className="text-xl text-white/80 mb-8">Mint keys, win the pool, or burn for rewards</p>
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <Button 
            className={`w-64 h-16 text-2xl font-bold rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 ease-in-out transform ${
              mintData?.disabled ? 'opacity-50 cursor-not-allowed' : 'animate-pulse hover:scale-105'
            } text-white`}
            onClick={handleMint}
            disabled={mintData?.disabled}
          >
            {mintData ? "Ape In" : 'Loading...'}
          </Button>
          <p className="text-lg font-semibold">
            Current Mint Price: <span className="text-yellow-300">{mintData ? mintData.links.actions[0].label.split('for ')[1] : 'Loading...'}</span>
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Winner Pool Prize"
          value={mintData ? <AnimatedNumber value={parseFloat(mintData.title.match(/\$([\d,.]+)/)?.[1].replace(/,/g, '') || '0') } prefix="$" /> : null}
          subtitle="in SEND tokens"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          trend="up"
          loading={loading || !mintData}
        />
        <StatCard
          title="NFT Burn Claim Value"
          value={<AnimatedNumber value={burnData ? parseFloat(burnData.title.match(/\$([\d,.]+)/)?.[1] || '0') : 0} prefix="$" />}
          subtitle="per NFT"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          loading={loading}
        />
        <StatCard
          title="Floor Price"
          value={collectionStats && solPrice ? <AnimatedNumber value={floorPriceUSD} prefix="$" /> : <AnimatedNumber value={2500} prefix="$" />}
          subtitle="on Tensor"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          trend="up"
          loading={loading || !collectionStats || !solPrice}
        />
        <StatCard
          title="SEND Token Price"
          value={sendPrice ? <AnimatedNumber value={sendPrice} prefix="$" decimalPlaces={4} /> : <AnimatedNumber value={0.15} prefix="$" />}
          subtitle="current market"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          trend="up"
          loading={loading || sendPrice === null}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Keys Minted"
          value={collectionStats ? <AnimatedNumber value={collectionStats.statsV2.numMints} /> : <AnimatedNumber value={50000} />}
          subtitle="and increasing"
          icon={<Key className="w-5 h-5 text-yellow-400" />}
          loading={loading || !collectionStats}
        />
        <StatCard
          title="Keys in Circulation"
          value={collectionStats ? <AnimatedNumber value={collectionStats.statsV2.numListed} /> : <AnimatedNumber value={45000} />}
          subtitle="active keys"
          icon={<Key className="w-5 h-5 text-blue-400" />}
          loading={loading || !collectionStats}
        />
        {/* <StatCard
          title="Total Keys Burnt"
          value={<AnimatedNumber value={5000} />}
          subtitle="redeemed for rewards"
          icon={<Flame className="w-5 h-5 text-red-400" />}
          loading={loading}
        /> */}
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Current Mint Number</h2>
        <div className="text-5xl font-mono font-bold text-white">
          {collectionStats ? <AnimatedNumber value={currentMintNumber} /> : <AnimatedNumber value={50001} />}
        </div>
      </div>
    </div>
  )
}
