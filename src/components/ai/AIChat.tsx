import React, { useState } from 'react';

const AIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      console.log('Sending request:', { prompt });

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'medical',
          prompt,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Received response:', data);

      if (data.error) {
        setError(data.error);
      } else if (!data.text) {
        setError('Received empty response from AI service');
      } else {
        setResponse(data.text);
      }
    } catch (err) {
      console.error('Error in AI chat:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {response && <p>{response}</p>}
    </div>
  );
};

export default AIChat;