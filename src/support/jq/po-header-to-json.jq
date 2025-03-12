# Extract the translators map in JSON from the 

# For each line
split("\n")
    # Filter only the lines containing the information we need
    | map(select(startswith("\"Language-Team:") or startswith("\"Language:")))
    # Extract only the values from those lines
    | map(sub("^\"(Language|Language-Team): (?<value>[\\w, ]+).*$"; "\(.value)"))
    # Remove the empty lines
    | map(select(length > 0))
    # Convert the values into arrays in order to split the translator names
    | [ .[] | if (index(.) % 2) == 0 then split(", *"; null) else [.] end ]
    # Convert the array into an object
    | . as $array | reduce (range(0; $array | length; 2)) as $i ({};
        . + {($array[$i + 1][0]): $array[$i]}
    )