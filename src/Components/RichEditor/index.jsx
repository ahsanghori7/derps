import React from "react";
import { ContentState, convertFromHTML, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";
import './style.css'
// import '../../../node_modules/draft-js/dist/Draft.css'
import '../../../node_modules/draft-js/dist/Draft.css'
import { stateToHTML } from "draft-js-export-html";

window.global = window;

class RichTextEditor extends React.Component {
  constructor(props) {
    super(props);
    // const draftContent = localStorage.getItem("draftContent");
    // this.state = { editorState: EditorState.createEmpty() };

    const blocksFromHTML = convertFromHTML(props.initialContent || "");
    const contentState = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
    const editorState = EditorState.createWithContent(contentState);
    this.state = { editorState, hasUserEdited: false, lastAppliedInitialContent: props.initialContent || "" };


    // this.focus = () => this.refs.editor.focus();
    // this.onChange = (editorState) => {
    //   this.setState({ editorState });
    //   const html = this.getContentWithHTML(editorState);
    //   this.props.onGetContent(html);// Call the function passed from parent with HTML content
    // };
    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => {
      this.setState({ editorState, hasUserEdited: true });
      const html = this.getContentWithHTML(editorState);
      this.props.onGetContent(html); // Call the parent callback with HTML content
    };
    this.handleKeyCommand = this._handleKeyCommand.bind(this);
    this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this);
    this.toggleBlockType = this._toggleBlockType.bind(this);
    this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
    this.getContentWithHTML = this._getContentWithHTML.bind(this); // Bind the method
    // this.getContentWithHTML = this._getContentWithHTML.bind(this);
  }
  componentDidUpdate(prevProps) {
    const nextInitial = this.props.initialContent || "";

    // Allow parent to set initial content after mount (e.g. prefill),
    // but never overwrite once user started editing.
    if (
      prevProps.initialContent !== this.props.initialContent &&
      nextInitial &&
      !this.state.hasUserEdited &&
      nextInitial !== this.state.lastAppliedInitialContent
    ) {
      const blocksFromHTML = convertFromHTML(nextInitial);
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap
      );
      const editorState = EditorState.createWithContent(contentState);
      this.setState({ editorState, lastAppliedInitialContent: nextInitial });
    }
  }
  //   componentDidUpdate(prevProps) {
  //     if (prevProps.initialContent !== this.props.initialContent) {
  //       const blocksFromHTML = convertFromHTML(this.props.initialContent);
  //       const contentState = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
  //       const editorState = EditorState.createWithContent(contentState);
  //       this.setState({ editorState });
  //     }
  //     if (prevProps.language !== this.props.language) {
  //       this.setState({ language: this.props.language });
  //     }
  //   }

  _handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _mapKeyToEditorCommand(e) {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        this.state.editorState,
        4, /* maxDepth */
      );
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  _getContentWithHTML(editorState) {
    const contentState = editorState.getCurrentContent();
    return stateToHTML(contentState); // Return the HTML content
  }



  render() {
    const { editorState } = this.state;

    // If the user changes block type before entering any text, we can
    // either style the placeholder or hide it. Let's just hide it now.
    let className = 'RichEditor-editor';
    // if (language === 'arabic') {
    //   className += 'RichEditor-arabic'; // Apply Arabic styling
    // }
    var contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' RichEditor-hidePlaceholder';
      }
    }

    return (
      <div className="RichEditor-root">
        {/* <div className="RichEditor-controls">
          <button onClick={this.getContentWithHTML}>Get Content with HTML</button>
        </div> */}
        <div className="RichEditor-controls-container">
          <BlockStyleControls
            editorState={editorState}
            onToggle={this.toggleBlockType}
          />
          <InlineStyleControls
            editorState={editorState}
            onToggle={this.toggleInlineStyle}
          />
        </div>
        <div className={className} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onChange={this.onChange}
            placeholder="Type your content here..."
            ref="editor"
            spellCheck={true}
            textAlignment={'left'}
          />
        </div>

      </div>
    );
  }
}

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}

// class StyleButton extends React.Component {
//   constructor() {
//     super();
//     this.onToggle = (e) => {
//       e.preventDefault();
//       this.props.onToggle(this.props.style);
//     };
//   }

//   render() {
//     let className = 'RichEditor-styleButton';
//     if (this.props.active) {
//       className += ' RichEditor-activeButton';
//     }

//     return (
//       <span className={className} onMouseDown={this.onToggle}>
//         {this.props.label}
//       </span>
//     );
//   }
// }

const BLOCK_TYPES = [
  { label: 'H1', style: 'header-one' },
  { label: 'H2', style: 'header-two' },
  { label: 'H3', style: 'header-three' },
  { label: 'H4', style: 'header-four' },
  { label: 'H5', style: 'header-five' },
  { label: 'H6', style: 'header-six' },
  { label: 'Blockquote', style: 'blockquote' },
  { label: 'Code Block', style: 'code-block' },
];

const BlockStyleControls = (props) => {
  const { editorState } = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <StyleButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};

var INLINE_STYLES = [
  { label: 'Bold', style: 'BOLD' },
  { label: 'Italic', style: 'ITALIC' },
  { label: 'Underline', style: 'UNDERLINE' },
  { label: 'Monospace', style: 'CODE' },
];

const InlineStyleControls = (props) => {
  const currentStyle = props.editorState.getCurrentInlineStyle();

  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map((type) =>
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};

class StyleButton extends React.Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    let className = 'RichEditor-styleButton';
    if (this.props.active) {
      className += ' RichEditor-activeButton';
    }

    return (
      <span className={className} onMouseDown={this.onToggle}>
        {this.props.label}
      </span>
    );
  }
}

export default RichTextEditor;