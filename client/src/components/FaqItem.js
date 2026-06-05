import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import '../pages/ServicePages.css';

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="sp-faq-item">
      <button className="sp-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {q}
        <ChevronDown size={16} className={`sp-faq-chevron${open ? ' sp-faq-chevron--open' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="sp-faq-a">{a}</div>}
    </div>
  );
};

export default FaqItem;
