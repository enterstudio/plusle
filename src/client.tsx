import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {observable, computed, action} from 'mobx'
import {observer} from 'mobx-react'

declare var window: any
window.main = function() {
    const game = new Game()
    window.poke = game.pokemon[0]
    ReactDOM.render(<GameView game={game}/>, document.body)
}

class Game {
    @observable width: number
    @observable height: number
    @observable pokemon: Pokemon[] = []

    constructor() {
        this.pokemon.push(new Pokemon(this))
    }
}

@observer
class GameView extends React.Component<{ game: Game }> {
    prevTime: number = 0
    @action.bound frame(timestamp: number) {
        const deltaTime = timestamp - this.prevTime
        this.prevTime = timestamp
        
        this.props.game.pokemon.forEach(poke => poke.onFrame(deltaTime))

        requestAnimationFrame(this.frame)
    }

    componentDidMount() {
        window.addEventListener('resize', this.onResize)
        this.onResize()

        requestAnimationFrame(this.frame)
    }

    base: HTMLDivElement
    @action.bound onResize() {
        const rect = this.base.getBoundingClientRect()
        this.props.game.width = rect.width
        this.props.game.height = rect.height 
        this.props.game.pokemon[0].x = rect.width/2
        this.props.game.pokemon[0].y = rect.height/2
        this.props.game.pokemon[0].pokedexNum = 311
    }

    render() {
        const {game} = this.props

        return <main>
            {game.pokemon.map(poke =>
                [<ImgPreloader poke={poke}/>,
                <img 
                    src={poke.imageUrl} 
                    width={poke.width} 
                    height={poke.height} 
                    style={{position: 'absolute', left: poke.x-poke.width/2, top: poke.y-poke.height/2}}
                    onClick={e => { poke.isMessageActive = true }}
                    onTouchStart={e => { poke.isMessageActive = true }}
                />,
                poke.isMessageActive && <PokeMessage poke={poke}/>]
            )}
        </main>
    }
}

@observer
class ImgPreloader extends React.Component<{ poke: Pokemon }> {
    @computed get urlsToLoad(): string[] {
        const {poke} = this.props
        const urls = []
        for (let dir of ['up', 'down', 'left', 'right']) {
            urls.push(`./overworld/${dir}/${poke.pokedexNum}.png`)
            urls.push(`./overworld/${dir}/frame2/${poke.pokedexNum}.png`)
        }
        return urls
    }

    render() {
        return <div style={{ opacity: 0 }}>
            <p style={{ opacity: 0 }}>Load pokefont</p>
            {this.urlsToLoad.map(url => <img src={url}/>)}
        </div>
    }
}

@observer
class PokeMessage extends React.Component<{ poke: Pokemon }> {
    render() {
        const {poke} = this.props
        const {message} = poke

        const charsPerLine = (poke.game.width-20*2)/16
        const numLines = Math.ceil(message.length/charsPerLine)
        const messageWidth = charsPerLine*16

        const lines = []
        let line = ""
        for (let word of message.split(" ")) {
            if (line.length && line.length+word.length+1 > charsPerLine) {
                lines.push(line)
                line = ""
            }
            line += line.length ? ` ${word}` : word
        }
        if (line.length) lines.push(line)

        let length = 0
        return <div className="message">{lines.map(line => {
            let p
            if (length > poke.messageChars)
                return <p style={{ width: messageWidth }}><br/></p>
            else if (length+line.length > poke.messageChars)
                p = <p style={{ width: messageWidth }}>{line.slice(0, poke.messageChars-length)||<br/>}</p>
            else
                p = <p style={{ width: messageWidth }}>{line||<br/>}</p>

            length += line.length
            return p
        })}</div>
    }
}

class Pokemon {
    game: Game

    @observable x: number = 0
    @observable y: number = 0
    @observable width: number = 64
    @observable height: number = 64

    @observable pokedexNum: number = Math.floor(Math.random()*494)
    @observable facing: 'up'|'down'|'left'|'right' = 'down'
    @observable frameToggle: boolean = false

    walkCounter: number = 0
    facingCounter: number = 0

    messageCounter: number = 0
    @observable isMessageActive: boolean = false
    @observable messageIndex: number = 0
    @observable messageChars: number = 0
    
    constructor(game: Game) {
        this.game = game
    }

    @computed get imageUrl() {
        return `./overworld/${(this.isMessageActive) ? 'down' : this.facing}/${this.frameToggle ? 'frame2/' : ''}${this.pokedexNum}.png`
    }

    @computed get messages() {
        return [
            "You are a good person.",
            "I believe in you.",
            "All life has value.",
            "Work hard and never give up hope.",
            "You are capable of great things.",
            "Your friends love you."
        ]
    }

    @computed get message() {
        return this.messages[this.messageIndex]
    }

    @action.bound onFrame(deltaTime: number) {
        this.messageCounter += deltaTime
        if (!this.isMessageActive && this.messageCounter > 5000) {
            this.isMessageActive = true
            this.messageCounter = 0
        } else if (this.isMessageActive && this.messageChars < this.message.length && this.messageCounter > 100) {
            this.messageChars += 1
            this.messageCounter = 0
        } else if (this.isMessageActive && this.messageChars === this.message.length && this.messageCounter > 2000) {
            this.isMessageActive = false
            this.messageChars = 0
            this.messageCounter = 0
            this.messageIndex += 1
            if (this.messageIndex >= this.messages.length)
                this.messageIndex = 0
        }

        if (this.isMessageActive) {
            return
        }

        this.walkCounter += deltaTime
        if (this.walkCounter > 200) {
            this.frameToggle = !this.frameToggle
            this.walkCounter = 0
        }

        this.facingCounter += deltaTime
        if (this.facingCounter > 1000) {
            this.facing = ['up', 'down', 'left', 'right'][Math.floor(Math.random()*4)] as any
            this.facingCounter = 0
        }

        if (this.y < this.height) {
            this.facing = 'down'
        } else if (this.y > this.game.height-this.height-64) {
            this.facing = 'up'
        } else if (this.x < this.width) {
            this.facing = 'right'
        } else if (this.x > this.game.width-this.width) {
            this.facing = 'left'
        }

        const speed = 0.05
        if (this.facing === 'up') {
            this.y -= deltaTime*speed
        } else if (this.facing === 'down') {
            this.y += deltaTime*speed
        } else if (this.facing === 'left') {
            this.x -= deltaTime*speed
        } else if (this.facing === 'right') {
            this.x += deltaTime*speed
        }
    }
}