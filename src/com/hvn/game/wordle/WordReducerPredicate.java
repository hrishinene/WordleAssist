package com.hvn.game.wordle;

public interface WordReducerPredicate {
	char getChar();
	boolean pass(Word5 word);
	int getPriority();
}
