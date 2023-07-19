import {
  Excalidraw,
  MainMenu,
  THEME,
  exportToCanvas,
  serializeAsJSON,
} from "@excalidraw/excalidraw"
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types"
import {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types/types"
import { entries, get, set } from "idb-keyval"
import { debounce } from "lodash"
import { useEffect, useRef, useState } from "react"
import mitt from "mitt"

type Events = {
  save: State
}
const emitter = mitt<Events>()

function File(
  props: { data: State } & React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >
) {
  const [src, setSrc] = useState("")
  useEffect(() => {
    exportToCanvas(props.data).then((canvas) => {
      setSrc(canvas.toDataURL())
    })
  }, [props.data])
  return (
    <div className="flex items-center gap-4 cursor-pointer" onClick={props.onClick}>
      <img className="w-16 h-16 rounded-xl object-cover" src={src} alt="" />
      <h3>{props.data.appState.name}</h3>
    </div>
  )
}

function Files(props: { onSelect?: (data: State) => void }) {
  const [db, setDB] = useState<State[]>([])
  useEffect(() => {
    entries().then((items) => {
      setDB(items.map(([, value]) => value))
    })
  }, [])
  useEffect(() => {
    const handleSave = (data: State) => {
      setDB((db) => {
        const dbItem = db.find((item) => item.appState.name === data.appState.name)
        if (dbItem) {
          return db.map((item) => {
            if (item.appState.name === data.appState.name) {
              return data
            }
            return item
          })
        } else {
          return db
        }
      })
    }
    emitter.on("save", handleSave)
    return () => {
      emitter.off("save", handleSave)
    }
  }, [])
  return (
    <div className="p-2 space-y-2">
      {db.map((item) => (
        <File
          key={item.appState.name}
          data={item}
          onClick={() => {
            props.onSelect?.(item)
          }}
        ></File>
      ))}
    </div>
  )
}

type State = {
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

function useInitialData(id?: string) {
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<null | State>(null)
  useEffect(() => {
    if (id) {
      get(id)
        .then((data: State) => {
          if (data) {
            setData(data)
          }
          setReady(true)
        })
        .catch(() => {
          setReady(true)
        })
    } else {
      setReady(true)
    }
  }, [id])
  return { ready, data }
}

// TODO
// - New
// - Open
// - Delete
// - Files Drawer
// - Library
function Scene(props: { id?: string; onSave?: (data: State) => void }) {
  const initialData = useInitialData(props.id)
  const excalidrawApi = useRef<ExcalidrawImperativeAPI>(null)
  const onChange: ExcalidrawProps["onChange"] = debounce((elements, appState, files) => {
    console.log("onChange", elements, appState, files)
    // localStorage.setItem("jam-excalidraw", serializeAsJSON(elements, appState, files, "local"))
    localStorage.setItem("jam-excalidraw-id", appState.name)
    const state = { elements, appState, files }
    set(appState.name, state)
    props.onSave?.(state)
  }, 500)
  if (!initialData.ready) return null
  return (
    <div style={{ height: "75vh" }}>
      <Excalidraw
        ref={excalidrawApi}
        initialData={initialData.data}
        theme={THEME.DARK}
        onChange={onChange}
      >
        <MainMenu>
          <MainMenu.Item onSelect={console.log}>
            <button>Files</button>
          </MainMenu.Item>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  )
}

export default function App() {
  const [id, setId] = useState(() => localStorage.getItem("jam-excalidraw-id") || "")
  return (
    <div>
      <Scene key={id} id={id} onSave={(e) => emitter.emit("save", e)}></Scene>
      <div>
        <Files
          onSelect={(scene) => {
            setId(scene.appState.name!)
          }}
        />
      </div>
    </div>
  )
}
