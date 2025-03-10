import React from "react";
import markdownit from "markdown-it";
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown.css';

type Props = {
  text: string;
  className?: string;
};

// Configure markdown-it with advanced options
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
}).enable('table');  // Enable tables using the enable method

const Markdown = ({ text, className = '' }: Props) => {
  const htmlContent = md.render(text);
  const sanitized = DOMPurify.sanitize(htmlContent);
  
  return (
    <div 
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default Markdown;