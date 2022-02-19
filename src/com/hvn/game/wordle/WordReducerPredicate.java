package com.hvn.game.wordle;

import com.hvn.game.wordle.Word5;

public interface WordReducerPredicate {
	char getChar();
	boolean pass(Word5 word);
	int getPriority();
}
