# Creates the extension-info.json starting with the package.json and additional data

# Create an object
{
    "version": .version,                    # Process the information from the input package.json
    "authors": $authors,                    # Add the authors information for everyone who committed after the fork
    "originalAuthors": $originalAuthors,    # Add the authors information for everyone who committed before the fork
    "translators": $translators,            # Add the translators for each language
    "changelog": (                          # Add the changelog, ensuring the keys are lowercase
        $changelog
            | walk(
                if type == "object" then
                    with_entries(
                        if .key | type == "string" then
                            .key |= ascii_downcase
                        else
                            .
                        end
                )
                else
                    .
                end
            )
    )
}