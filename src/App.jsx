import './App.css';
import {useRef, useState, memo, useMemo, useCallback} from 'react';

const handlePreventDefault = ev => ev.preventDefault();

const iterLine = function*(value, lineIsColumn, lineIndex) {
    const lineLength = lineIsColumn ? value.length : value[lineIndex].length;
    for (let indexInLine = 0; indexInLine < lineLength; indexInLine++) {
        const rowIndex = lineIsColumn ? indexInLine : lineIndex;
        const colIndex = lineIsColumn ? lineIndex : indexInLine;
        const cellValue = value[rowIndex][colIndex];
        yield [cellValue, colIndex, rowIndex];
    }
};

const addKnownEmptiesToLine = (value, lineIsColumn, lineIndex) => {
    for (const [cellValue, colIndex, rowIndex] of iterLine(value, lineIsColumn, lineIndex)) {
        if (cellValue === 0) {
            value[rowIndex][colIndex] = 2;
        }
    }
};

const lineIsPresumptivelySolved = (value, lineIsColumn, lineIndex, clue) => {
    let activeGroup = false;
    let numInGroup = null;
    let groupIndex = 0;

    for (const [cellValue, , ] of iterLine(value, lineIsColumn, lineIndex)) {
        if (cellValue === 1) {
            if (activeGroup) {
                if (numInGroup === clue[groupIndex]) {
                    return false;
                }
                numInGroup++;
            } else {
                if (groupIndex === clue.length) {
                    return false;
                }
                activeGroup = true;
                numInGroup = 1;
            }
        } else if (activeGroup) {
            if (numInGroup !== clue[groupIndex]) {
                return false;
            }
            groupIndex++;
            activeGroup = false;
        }
    }
    if (activeGroup) {
        return groupIndex === clue.length - 1 && numInGroup === clue[groupIndex];
    } else {
        return groupIndex === clue.length;
    }
};

const addKnownEmptiesForDisplay = (value, rowClues, colClues) => {
    let hasCopied = false;
    for (const [lineIsColumn, clues] of [[true, colClues], [false, rowClues]]) {
        for (let lineIndex = 0; lineIndex < clues.length; lineIndex++) {
            if (lineIsPresumptivelySolved(value, lineIsColumn, lineIndex, clues[lineIndex])) {
                if (!hasCopied) {
                    value = value.map(row => row.slice());
                    hasCopied = true;
                }
                addKnownEmptiesToLine(value, lineIsColumn, lineIndex);
            }
        }
    }
    return value;
};

const puzzleIsSolved = (value, rowClues, colClues) => {
    for (const [lineIsColumn, clues] of [[true, colClues], [false, rowClues]]) {
        for (let lineIndex = 0; lineIndex < clues.length; lineIndex++) {
            if (!lineIsPresumptivelySolved(value, lineIsColumn, lineIndex, clues[lineIndex])) {
                return false;
            }
        }
    }
    return true;
};

const computeCellValueAfterClick = (cellValue, buttons) => {
    if (cellValue === 0) {
        return buttons === 1 ? 1 : 2;
    } else if (cellValue === 1) {
        return buttons === 1 ? 0 : 2;
    } else {
        return buttons === 1 ? 1 : 0;
    }
};

const Clue = ({clue, isColHovered, Elt}) =>
    <th onMouseDown={handlePreventDefault} className={isColHovered ? 'colhover' : ''}>
        {clue.map((clueItem, i) => 
            <Elt key={i}>{clueItem}</Elt>
        )}
        {clue.length === 0 && '-'}
    </th>;

const ColClue = props =>
    <Clue {...props} Elt="div"/>;

const RowClue = props =>
    <Clue {...props} Elt="span"/>;

const tdClassNames = ['empty', 'filled', 'knownempty'];

const BoardCell = memo(({colIndex, rowIndex, value, onMouseMove, onMouseDown, onChangeHoveredCol, ...props}) => {
    const handleMouseMove = ev => onMouseMove(colIndex, rowIndex, ev);
    const handleMouseDown = ev => onMouseDown(colIndex, rowIndex, ev);
    const handleMouseEnter = () => onChangeHoveredCol(colIndex);
    const handleMouseLeave = () => onChangeHoveredCol(null);
    return <td
        {...props}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={tdClassNames[value]}
    >
       
    </td>
});

const BoardRow = memo(({row, rowIndex, rowClues, onMouseMove, onMouseDown, onChangeHoveredCol}) =>
    <tr>
        <RowClue clue={rowClues[rowIndex]}/>
        {row.map((cellValue, colIndex) =>
            <BoardCell
                key={colIndex}
                colIndex={colIndex}
                rowIndex={rowIndex}
                value={cellValue}
                onMouseMove={onMouseMove}
                onMouseDown={onMouseDown}
                onChangeHoveredCol={onChangeHoveredCol}
            />
        )}
    </tr>
);

const BoardBody = memo(({rowClues, displayValue, onMouseMove, onMouseDown, onChangeHoveredCol}) =>
    <tbody>
        {displayValue.map((row, rowIndex) =>
            <BoardRow
                key={rowIndex}
                row={row}
                rowIndex={rowIndex}
                rowClues={rowClues}
                onMouseMove={onMouseMove}
                onMouseDown={onMouseDown}
                onChangeHoveredCol={onChangeHoveredCol}
            />
        )}
    </tbody>
);


const Board = ({value, rowClues, colClues, onChange}) => {
    const lastHardChange = useRef(null);
    const [hoveredCol, setHoveredCol] = useState(null);
    const handleMouseDown = useCallback((colIndex, rowIndex, ev) => {
        if (ev.buttons !== 1 && ev.buttons !== 2) {
            return;
        }
        onChange(value => {
            const cellValue = value[rowIndex][colIndex];
            const newCellValue = computeCellValueAfterClick(cellValue, ev.buttons);
            lastHardChange.current = newCellValue;
            const newValue = value.slice();
            newValue[rowIndex] = newValue[rowIndex].slice();
            newValue[rowIndex][colIndex] = newCellValue;
            return newValue;
        });
        ev.preventDefault();
    }, [onChange]);
    const handleMouseMove = useCallback((colIndex, rowIndex, ev) => {
        if (ev.buttons !== 1 && ev.buttons !== 2) {
            return;
        }
        onChange(value => {
            if (lastHardChange.current === null) {
                return value;
            }
            if (value[rowIndex][colIndex] === lastHardChange.current) {
                return value;
            }
            const newValue = value.slice();
            newValue[rowIndex] = newValue[rowIndex].slice();
            newValue[rowIndex][colIndex] = lastHardChange.current;
            return newValue;
        });
    }, [onChange]);
    const displayValue = useMemo(
        () => addKnownEmptiesForDisplay(value, rowClues, colClues),
        [value, rowClues, colClues]
    );
    const isSolved = useMemo(
        () => puzzleIsSolved(value, rowClues, colClues),
        [value, rowClues, colClues]
    );
    return <table className="board" onContextMenu={handlePreventDefault}>
        {isSolved &&
            <caption style={{captionSide: 'bottom'}}>Solved!</caption>
        }
        <thead>
            <tr>
                <th/>
                {colClues.map((clue, i) =>
                    <ColClue
                        key={i}
                        clue={clue}
                        isColHovered={hoveredCol === i}
                    />
                )}
            </tr>
        </thead>
        <BoardBody
            rowClues={rowClues}
            displayValue={displayValue}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onChangeHoveredCol={setHoveredCol}
        />
    </table>;
};

const makeBoard = (width, height) =>
    Array(height).fill(Array(width).fill(0));

const makeRandomBoard = (width, height) => {
    const result = [];
    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        const row = [];
        for (let colIndex = 0; colIndex < width; colIndex++) {
            row.push(Math.random() < 0.5 ? 1 : 0);
        }
        result.push(row);
    }
    return result;
};

const clueFromLine = (value, lineIsColumn, lineIndex) => {
    const result = [];
    let activeGroup = false;
    let numInGroup;
    for (const [cellValue, , ] of iterLine(value, lineIsColumn, lineIndex)) {
        if (cellValue === 1) {
            if (activeGroup) {
                numInGroup++;
            } else {
                activeGroup = true;
                numInGroup = 1;
            }
        } else if (activeGroup) {
            result.push(numInGroup);
            activeGroup = false;
        }
    }
    if (activeGroup) {
        result.push(numInGroup);
    }
    return result;
};

const cluesFromBoard = (value) => {
    const height = value.length;
    const width = value[0].length;
    const rowClues = [];
    const colClues = [];
    for (const [lineIsColumn, numLines, clues] of [[false, height, rowClues], [true, width, colClues]]) {
        for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
            clues.push(clueFromLine(value, lineIsColumn, lineIndex));
        }
    }
    return [rowClues, colClues];
};

const tryToConvertSizeToNumber = txt => {
    const size = parseInt(txt, 10);
    if (!size || isNaN(size) || !isFinite(size) || size < 1) {
        return null;
    }
    return size;
};

const App = () => {
    const [width, setWidth] = useState('8');
    const [height, setHeight] = useState('8');
    const numWidth = tryToConvertSizeToNumber(width);
    const numHeight = tryToConvertSizeToNumber(height);
    const newPuzzleDisabled = numWidth === null || numHeight === null;
    const initPuzzle = () => {
        const correctBoard = makeRandomBoard(numWidth, numHeight);
        const [rowClues, colClues] = cluesFromBoard(correctBoard);
        return [rowClues, colClues];
    }
    const [[rowClues, colClues], setPuzzle] = useState(initPuzzle);
    const [value, setValue] = useState(() => makeBoard(numWidth, numHeight));
    const handleNewPuzzle = () => {
        setPuzzle(initPuzzle());
        setValue(makeBoard(numWidth, numHeight));
    };
    return <>
        <div>Width: <input type="number" value={width} onChange={ev => setWidth(ev.target.value)}/></div>
        <div>Height: <input type="number" value={height} onChange={ev => setHeight(ev.target.value)}/></div>
        <div><input type="button" value="New puzzle" disabled={newPuzzleDisabled} onClick={handleNewPuzzle}/></div>
        <Board
            value={value}
            onChange={setValue}
            rowClues={rowClues}
            colClues={colClues}/>
    </>;
};

export default App;
