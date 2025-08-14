; Mustache sections
(section
  open: (section_open
    (identifier) @name)) @item

; Inverted sections
(inverted_section
  open: (inverted_section_open
    (identifier) @name)) @item

; Partials
(partial
  (identifier) @name) @item

; HTML headings for structure
(html_tag
  (tag_name) @_tag
  (#match? @_tag "^h[1-6]$")
  (html_content) @name) @item

; HTML sections and articles for structure
(html_tag
  (tag_name) @_tag
  (#match? @_tag "^(section|article|nav|aside|main|header|footer)$")
  (html_attribute
    (attribute_name) @_attr
    (#eq? @_attr "id")
    (attribute_value) @name)?) @item

; Comments as context
(comment) @context

; HTML comments as context
(html_comment) @context
