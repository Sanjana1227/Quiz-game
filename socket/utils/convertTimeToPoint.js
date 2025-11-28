const convertTimeToPoint = (startTime, durationSeconds) => {
  // Default full score
  let maxPoints = 1000

  // If startTime is invalid, give minimum points
  if (!startTime || !durationSeconds) return 0

  // Current time
  const now = Date.now()

  // Time passed since question started (in seconds)
  const elapsed = (now - startTime) / 1000

  // Deduct points proportional to elapsed time
  let points = maxPoints - (maxPoints / durationSeconds) * elapsed

  // Clamp between 0 and maxPoints
  points = Math.max(0, points)

  // ✅ Round to integer (no decimals)
  return Math.round(points)
}

export default convertTimeToPoint
