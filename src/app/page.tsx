"use client"

import dynamic from "next/dynamic"
import Image from "next/image"

const App = dynamic(() => import("./components/App"), { ssr: false })

export default function Home() {
  return <App />
}
