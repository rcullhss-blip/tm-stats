#!/bin/bash
# TM Stats — Claude Code Status Line
# Shows: model, context bar, token counts, cost, git branch
# Install: copy to ~/.claude/hooks/statusline.sh and chmod +x
# Then add to ~/.claude/settings.json:
# { "statusLine": { "type": "command", "command": "~/.claude/hooks/statusline.sh" } }
#
# Requires: jq (install with: brew install jq  OR  sudo apt install jq)

input=$(cat)

# Colours
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[91m'
CYAN=$'\033[36m'
GRAY=$'\033[90m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

# Extract values from JSON Claude Code sends
MODEL=$(echo "$input" | jq -r '.model.display_name // "unknown"' 2>/dev/null)
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' 2>/dev/null | cut -d. -f1)
ITOK=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0' 2>/dev/null)
OTOK=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0' 2>/dev/null)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0' 2>/dev/null)

# Format token counts (convert to K)
ITOK_K=$(echo "$ITOK" | awk '{printf "%.0fK", $1/1000}')
OTOK_K=$(echo "$OTOK" | awk '{printf "%.0fK", $1/1000}')

# Format cost
COST_FMT=$(echo "$COST" | awk '{printf "$%.2f", $1}')

# Shorten model name
case "$MODEL" in
  *"Opus"*)   MODEL_SHORT="${BOLD}[OP]${RESET}" ;;
  *"Sonnet"*) MODEL_SHORT="${CYAN}[SN]${RESET}" ;;
  *"Haiku"*)  MODEL_SHORT="${GRAY}[HK]${RESET}" ;;
  *)          MODEL_SHORT="[??]" ;;
esac

# Build context progress bar (15 chars wide)
BAR_WIDTH=15
FILLED=$(( PCT * BAR_WIDTH / 100 ))
EMPTY=$(( BAR_WIDTH - FILLED ))
BAR=""
[ "$FILLED" -gt 0 ] && BAR=$(printf "%${FILLED}s" | tr ' ' '▓')
[ "$EMPTY"  -gt 0 ] && BAR="${BAR}$(printf "%${EMPTY}s" | tr ' ' '░')"

# Colour the bar based on usage
if   [ "$PCT" -ge 80 ]; then BAR_COLOR="$RED"
elif [ "$PCT" -ge 50 ]; then BAR_COLOR="$YELLOW"
else                         BAR_COLOR="$GREEN"
fi

# Warning messages at thresholds
WARN=""
if   [ "$PCT" -ge 90 ]; then WARN=" ${RED}${BOLD}⚠ RUN /compact NOW${RESET}"
elif [ "$PCT" -ge 75 ]; then WARN=" ${YELLOW}⚡ Consider /compact${RESET}"
elif [ "$PCT" -ge 50 ]; then WARN=" ${YELLOW}↑ Context filling${RESET}"
fi

# Git branch (if in a git repo)
GIT_BRANCH=""
if command -v git &>/dev/null; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ -n "$BRANCH" ]; then
    # Check for uncommitted changes
    DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DIRTY" -gt 0 ]; then
      GIT_BRANCH=" ${GRAY}git:${RESET}${YELLOW}${BRANCH}*${RESET}"
    else
      GIT_BRANCH=" ${GRAY}git:${RESET}${GREEN}${BRANCH}${RESET}"
    fi
  fi
fi

# Assemble the status line
echo -e "${MODEL_SHORT} ${BAR_COLOR}${BAR}${RESET} ${BAR_COLOR}${PCT}%${RESET} | in:${ITOK_K} out:${OTOK_K} | ${COST_FMT}${GIT_BRANCH}${WARN}"
