import katex from 'katex'

// $...$ en línea y $$...$$ en bloque. Dentro de una fórmula, \$ es un signo peso.
const MATH = /(\$\$(?:\\[\s\S]|[^\\])+?\$\$|\$(?:\\[\s\S]|[^$\\])+\$)/g

export function RichText({ text }: { text: string }) {
  const parts = text.split(MATH)
  return (
    <>
      {parts.map((part, i) => {
        const display = part.length > 4 && part.startsWith('$$') && part.endsWith('$$')
        const inline = !display && part.length > 2 && part.startsWith('$') && part.endsWith('$')
        if (!display && !inline) return <span key={i}>{part}</span>
        const tex = part.slice(display ? 2 : 1, display ? -2 : -1)
        const html = katex.renderToString(tex, { displayMode: display, throwOnError: false })
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </>
  )
}