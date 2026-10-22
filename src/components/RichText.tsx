import katex from 'katex'

export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g)
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