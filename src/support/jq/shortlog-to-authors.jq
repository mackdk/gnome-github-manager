# converts the output of git shortlog to an array of authors

# For each line
split("\n")
    # Trim leading an trailing whitespace
    | map(sub("^[ \t]+|[ \t]+$"; ""))
    # Remove the number of commits and keep only the name
    | map(sub("^[0-9]+\t"; ""))
    # Discard empty lines
    | map(select(length > 0))
