"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { fetchService, ApiError, SNAKE_GAME } from "@/services/fetch";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Pause,
  Play,
} from "lucide-react";
import { MailingListForm } from "./mailing-list-form";

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;
const MIN_SPEED = 50;

type Position = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const getRandomPosition = (snake: Position[]): Position => {
  let position: Position;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((seg) => seg.x === position.x && seg.y === position.y));
  return position;
};

type SubmitStatus = "idle" | "submitting" | "success" | "limit" | "error";

export function SnakeGame() {
  const { token, user } = useAuth();
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const directionRef = useRef(direction);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    setGameStarted(true);
  }, []);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      // Check wall collision
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        setGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => {
          const newScore = prev + 10;
          setHighScore((hs) => Math.max(hs, newScore));
          return newScore;
        });
        setFood(getRandomPosition(newSnake));
        setSpeed((prev) => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(moveSnake, speed);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, moveSnake, speed]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--game-grid")
      .trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food with glow effect
    const foodStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--food")
      .trim();
    ctx.shadowColor = foodStyle || "#f97316";
    ctx.shadowBlur = 15;
    ctx.fillStyle = foodStyle || "#f97316";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const snakeColor = getComputedStyle(document.documentElement)
        .getPropertyValue(isHead ? "--snake-head" : "--snake")
        .trim();

      if (isHead) {
        ctx.shadowColor = snakeColor || "#4ade80";
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = snakeColor || "#4ade80";
      ctx.beginPath();
      ctx.roundRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        isHead ? 6 : 4
      );
      ctx.fill();

      if (isHead) {
        ctx.shadowBlur = 0;
      }
    });
  }, [snake, food]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      if (gameOver) {
        // Ignore enter key press when focused on input to allow form submission
        if (e.key == "Enter" && target?.nodeName === "INPUT") {
          return;
        }

        if (e.key === " " || e.key === "Enter") {
          resetGame();
        }
        return;
      }

      if (!gameStarted) {
        if (e.key === " " || e.key === "Enter") {
          resetGame();
        }
        return;
      }

      if (e.key === " ") {
        setIsPaused((prev) => !prev);
        return;
      }

      const keyDirections: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
        W: "UP",
        S: "DOWN",
        A: "LEFT",
        D: "RIGHT",
      };

      const newDirection = keyDirections[e.key];
      if (!newDirection) return;

      const opposites: Record<Direction, Direction> = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      };

      if (opposites[newDirection] !== directionRef.current) {
        setDirection(newDirection);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver, gameStarted, resetGame]);

  // Submit the final score to the leaderboard when an authenticated user's
  // game ends. The backend caps submissions at 5/game/day (429 on overflow).
  useEffect(() => {
    if (!gameOver) {
      setSubmitStatus("idle");
      return;
    }
    if (!token || !user || score <= 0) return;
    setSubmitStatus("submitting");
    fetchService
      .submitScore({ game: SNAKE_GAME, score })
      .then(() => setSubmitStatus("success"))
      .catch((err) =>
        setSubmitStatus(
          err instanceof ApiError && err.status === 429 ? "limit" : "error"
        )
      );
  }, [gameOver, score, user]);

  const handleDirectionChange = (newDirection: Direction) => {
    if (gameOver || isPaused) return;

    const opposites: Record<Direction, Direction> = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };

    if (opposites[newDirection] !== directionRef.current) {
      setDirection(newDirection);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-mono font-bold text-primary tracking-tight">
            SNAKE
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            Classic arcade game
          </p>
        </div>

        {/* Score Display */}
        <div className="flex justify-between items-center px-4 py-3 bg-card rounded-lg border border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Score
            </p>
            <p className="text-2xl font-mono font-bold text-primary">{score}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              High Score
            </p>
            <p className="text-2xl font-mono font-bold text-foreground">
              {highScore}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Length
            </p>
            <p className="text-2xl font-mono font-bold text-foreground">
              {snake.length}
            </p>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="rounded-lg border-2 border-border mx-auto block bg-[var(--game-grid)]"
          />

          {/* Overlay for game states */}
          {(!gameStarted || gameOver || isPaused) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="text-center space-y-4">
                {gameOver ? (
                  <>
                    <h2 className="text-3xl font-mono font-bold text-accent">
                      GAME OVER
                    </h2>
                    <p className="text-lg font-mono text-muted-foreground">
                      Final Score:{" "}
                      <span className="text-primary">{score}</span>
                    </p>
                    {!token ? (
                      <p className="text-sm font-mono text-muted-foreground">
                        <Link to="/login" className="text-primary underline">
                          Log in
                        </Link>{" "}
                        to save your score to the leaderboard
                      </p>
                    ) : submitStatus === "submitting" ? (
                      <p className="text-sm font-mono text-muted-foreground">
                        Saving score…
                      </p>
                    ) : submitStatus === "success" ? (
                      <p className="text-sm font-mono text-primary">
                        Score saved to the leaderboard!
                      </p>
                    ) : submitStatus === "limit" ? (
                      <p className="text-sm font-mono text-muted-foreground">
                        Daily limit reached — score not saved.
                      </p>
                    ) : submitStatus === "error" ? (
                      <p className="text-sm font-mono text-destructive">
                        Couldn&apos;t save score. Try again later.
                      </p>
                    ) : null}
                    <MailingListForm />
                  </>
                ) : isPaused ? (
                  <h2 className="text-3xl font-mono font-bold text-foreground">
                    PAUSED
                  </h2>
                ) : (
                  <>
                    <h2 className="text-2xl font-mono font-bold text-foreground">
                      Ready to Play?
                    </h2>
                    <p className="text-sm text-muted-foreground font-mono">
                      Use arrow keys or WASD to move
                    </p>
                  </>
                )}
                <Button
                  onClick={gameOver || !gameStarted ? resetGame : () => setIsPaused(false)}
                  className="font-mono"
                  size="lg"
                >
                  {gameOver ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Play Again
                    </>
                  ) : isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Game
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {/* Pause Button */}
          {gameStarted && !gameOver && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="font-mono"
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
          )}

          {/* Mobile D-Pad */}
          <div className="md:hidden grid grid-cols-3 gap-2 w-40">
            <div />
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirectionChange("UP");
              }}
              onClick={() => handleDirectionChange("UP")}
              disabled={!gameStarted || gameOver}
            >
              <ArrowUp className="h-6 w-6" />
            </Button>
            <div />
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirectionChange("LEFT");
              }}
              onClick={() => handleDirectionChange("LEFT")}
              disabled={!gameStarted || gameOver}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-primary/50" />
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirectionChange("RIGHT");
              }}
              onClick={() => handleDirectionChange("RIGHT")}
              disabled={!gameStarted || gameOver}
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div />
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12"
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirectionChange("DOWN");
              }}
              onClick={() => handleDirectionChange("DOWN")}
              disabled={!gameStarted || gameOver}
            >
              <ArrowDown className="h-6 w-6" />
            </Button>
            <div />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-muted-foreground font-mono space-y-1">
          <p className="hidden md:block">
            Arrow keys or WASD to move • Space to pause
          </p>
          <p className="md:hidden">Use the D-pad to control the snake</p>
        </div>
      </div>
    </div>
  );
}
