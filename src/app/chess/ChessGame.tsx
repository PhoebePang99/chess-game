"use client";
import React, { useState } from 'react';
import { getBestMove } from './ai';
import { initialBoard, pieceUnicode } from './chessUtils';
import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

// Simple chessboard and game logic (replace with full logic as needed)
const initialFen = 'startpos'; // Use FEN for board state

export default function ChessGame() {
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState<{row: number, col: number} | null>(null);
  const [legalMoves, setLegalMoves] = useState<{row: number, col: number}[]>([]);
  const [highlightMoves, setHighlightMoves] = useState(true);
  const [aiLevel, setAiLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const chessRef = useRef<any>();
  useEffect(() => {
    if (!chessRef.current) chessRef.current = new Chess();
  }, []);
  const [isAiThinking, setIsAiThinking] = useState(false);


  // Game state
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Move piece on board
  function movePiece(from: {row: number, col: number}, to: {row: number, col: number}) {
    const chess = chessRef.current;
    const fromSq = String.fromCharCode(97 + from.col) + (8 - from.row);
    const toSq = String.fromCharCode(97 + to.col) + (8 - to.row);
    const move = chess.move({ from: fromSq, to: toSq, promotion: 'q' });
    if (!move) return;
    updateBoardFromChess();
    setSelected(null);
    setLegalMoves([]);
    checkGameOver();
    if (!chess.isGameOver()) setTimeout(() => aiTurn(), 500);
  }

  function checkGameOver() {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      setGameOver(true);
      if (chess.isCheckmate()) {
        setWinner(chess.turn() === 'w' ? 'Black' : 'White');
      } else {
        setWinner('Draw');
      }
    }
  }

  function updateBoardFromChess() {
    const chess = chessRef.current;
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    chess.board().forEach((row: any[], i: number) => {
      row.forEach((piece, j) => {
        if (piece) newBoard[i][j] = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
      });
    });
    setBoard(newBoard);
  }

  // AI makes a move (random for now)
  async function aiTurn() {
    setIsAiThinking(true);
    const chess = chessRef.current;
    // Use chess.js to get all legal moves for black
    const moves = chess.moves({ verbose: true });
    const blackMoves = moves.filter((m: any) => m.color === 'b');
    if (blackMoves.length === 0) {
      setIsAiThinking(false);
      checkGameOver();
      return;
    }
    let move;
    if (aiLevel === 'easy') {
      // Random move
      move = blackMoves[Math.floor(Math.random() * blackMoves.length)];
    } else if (aiLevel === 'medium') {
      // Pick the move that captures the highest value piece, else random
      const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      let best = blackMoves[0], bestScore = -Infinity;
      for (const m of blackMoves) {
        let score = 0;
        if (m.captured) score += values[m.captured] || 0;
        if (score > bestScore) {
          best = m;
          bestScore = score;
        }
      }
      move = bestScore > 0 ? best : blackMoves[Math.floor(Math.random() * blackMoves.length)];
    } else {
      // Hard: minimax 2-ply (AI move, then player best reply)
      let best = blackMoves[0], bestScore = -Infinity;
      for (const m of blackMoves) {
        chess.move({ from: m.from, to: m.to, promotion: 'q' });
        // Now simulate all possible white replies
        const whiteMoves = chess.moves({ verbose: true }).filter((wm: any) => wm.color === 'w');
        let worstForPlayer = Infinity;
        if (whiteMoves.length === 0) {
          // If no reply, evaluate board
          worstForPlayer = evaluateBoard(chess.board());
        } else {
          for (const wm of whiteMoves) {
            chess.move({ from: wm.from, to: wm.to, promotion: 'q' });
            const evalScore = evaluateBoard(chess.board());
            chess.undo();
            if (evalScore < worstForPlayer) worstForPlayer = evalScore;
          }
        }
        chess.undo();
        if (worstForPlayer > bestScore) {
          best = m;
          bestScore = worstForPlayer;
        }
      }
      move = best;
    }
    chess.move({ from: move.from, to: move.to, promotion: 'q' });
    updateBoardFromChess();
    setIsAiThinking(false);
    checkGameOver();
  }

  // Simple board evaluation: material count
  function evaluateBoard(board: any[][]) {
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let score = 0;
    for (const row of board) for (const piece of row) {
      if (!piece) continue;
      if (piece.color === 'b') score += values[piece.type] || 0;
      if (piece.color === 'w') score -= values[piece.type] || 0;
    }
    return score;
  }

  // Highlight legal moves for selected piece
  function handleSelect(i: number, j: number) {
    if (isAiThinking) return;
    if (selected && selected.row === i && selected.col === j) {
      setSelected(null);
      setLegalMoves([]);
      return;
    }
    const chess = chessRef.current;
    const fromSq = String.fromCharCode(97 + j) + (8 - i);
    const moves = chess.moves({ square: fromSq, verbose: true });
    if (moves.length > 0 && board[i][j] && board[i][j] === board[i][j].toUpperCase()) {
      setSelected({ row: i, col: j });
      setLegalMoves(moves.map((m: any) => {
        const to = m.to;
        return { row: 8 - parseInt(to[1]), col: to.charCodeAt(0) - 97 };
      }));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <h1 className="text-3xl font-extrabold mb-4 tracking-widest text-pink-600 drop-shadow">CHESS GAME</h1>
      <div className="grid grid-cols-8 grid-rows-8 gap-0 border-4 border-gray-700 rounded-lg overflow-hidden">
        {board.map((row, i) =>
          row.map((piece, j) => {
            const isSelected = selected && selected.row === i && selected.col === j;
            const isLegal = highlightMoves && legalMoves.some(m => m.row === i && m.col === j);
            return (
              <div
                key={i + '-' + j}
                className={`w-12 h-12 flex items-center justify-center text-2xl select-none cursor-pointer ${
                  (i + j) % 2 === 0 ? 'bg-white' : 'bg-black text-white'
                } ${isSelected ? 'ring-4 ring-blue-400' : ''} ${isLegal ? 'ring-4 ring-green-400' : ''}`}
                onClick={() => {
                  if (isAiThinking || gameOver) return;
                  if (selected && legalMoves.some(m => m.row === i && m.col === j)) {
                    movePiece(selected, { row: i, col: j });
                  } else {
                    handleSelect(i, j);
                  }
                }}
              >
                {piece ? (
                  <span className={piece === piece.toUpperCase() ? 'text-pink-500' : 'text-green-600'}>
                    {pieceUnicode[piece]}
                  </span>
                ) : ''}
              </div>
            );
          })
        )}
      </div>
      {/* Move history removed */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={highlightMoves}
            onChange={e => setHighlightMoves(e.target.checked)}
            className="accent-pink-500"
          />
          <span className="text-sm text-gray-700">Highlight legal moves</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-700">AI Difficulty:</span>
          <select
            value={aiLevel}
            onChange={e => setAiLevel(e.target.value as 'easy' | 'medium' | 'hard')}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      {isAiThinking && <div className="mt-2 text-yellow-600">AI is thinking...</div>}
      <div className="mt-2 text-sm text-gray-500">Click your piece, then its destination square. Only legal moves are allowed.</div>
      {gameOver && (
        <>
          <Fireworks />
          <div className="mt-6 text-2xl font-bold text-orange-600 drop-shadow-lg animate-bounce">
            {winner === 'Draw' ? 'Draw!' : `${winner} wins!`}
          </div>
        </>
      )}
    </div>
  );

  // Fireworks component
  function Fireworks() {
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        <svg width="100vw" height="100vh" className="w-screen h-screen">
          {[...Array(7)].map((_, i) => (
            <g key={i}>
              {[...Array(12)].map((_, j) => {
                const angle = (j / 12) * 2 * Math.PI;
                const x = 50 + 40 * Math.cos(angle + i);
                const y = 50 + 40 * Math.sin(angle + i);
                return (
                  <circle
                    key={j}
                    cx={x + '%'}
                    cy={y + '%'}
                    r={Math.random() * 6 + 4}
                    fill={`hsl(${i * 50 + j * 30},90%,70%)`}
                    opacity={0.7}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    );
  }
}
// ...existing code...
