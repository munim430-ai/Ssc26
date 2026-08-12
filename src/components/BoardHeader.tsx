export default function BoardHeader() {
  return (
    <header id="main-header2" className="board-header">
      <div className="board-header-inner">
        <div className="board-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Bangladesh Education Board Logo"
            width={80}
            height={80}
            className="board-logo-img"
          />
        </div>
        <div className="board-title-wrap">
          <h4 className="board-title-main">WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD</h4>
          <h5 className="board-title-sub">JSC/JDC/SSC/DAKHIL/HSC/ALIM AND EQUIVALENT EXAMINATION</h5>
        </div>
      </div>
    </header>
  )
}
