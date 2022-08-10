
# Get the main field from package.json
FILE=$(grep '"main"' ./package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')

# test the path to see if the file exists
if test -f "$FILE"; then
  echo "Release is OK"
else
  echo "Release is NOT ok because the file specified as main in package.json at path ${FILE} does not exist"
  exit 1
fi