; Comments
(comment) @comment

; Section tags
(section
  open: (section_open) @keyword
  close: (section_close) @keyword)

(inverted_section
  open: (inverted_section_open) @keyword
  close: (section_close) @keyword)

; Section names/paths
(section_open
  (identifier) @variable)

(inverted_section_open
  (identifier) @variable)

(section_close
  (identifier) @variable)

; Variables
(variable
  (identifier) @variable)

; Unescaped variables
(unescaped_variable
  (identifier) @variable.special)

(triple_mustache_variable
  (identifier) @variable.special)

; Partials
(partial
  (identifier) @function)

; Mustache delimiters
["{{{" "{{" "}}}" "}}"] @punctuation.delimiter

; Section operators
["#" "^" "/"] @operator

; Partial operator
">" @operator

; Unescaped operator
"&" @operator

; Property access (MOJO-specific dot notation)
(identifier) @variable
"." @punctuation.delimiter

; Iterator operator (MOJO-specific)
"|iter" @keyword.operator

; Identifiers and paths
(path
  (identifier) @variable)

(path
  "." @punctuation.delimiter
  (identifier) @property)

; String content within mustache tags
(string_content) @string

; Whitespace control
["-" "~"] @operator

; HTML content (fallback to HTML highlighting)
(html_content) @text.literal

; HTML tags
(html_tag
  "<" @tag
  (tag_name) @tag
  ">" @tag)

(html_tag
  "</" @tag
  (tag_name) @tag
  ">" @tag)

; HTML attributes
(html_attribute
  (attribute_name) @attribute
  "=" @operator
  (attribute_value) @string)

; Quoted attribute values
(quoted_attribute_value) @string
